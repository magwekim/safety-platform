from pymongo import MongoClient, ASCENDING, DESCENDING
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
import logging
import os

logger = logging.getLogger(__name__)

# Database Connection
MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://127.0.0.1:27017/')
client = MongoClient(MONGO_URI)
db = client['safety_app']

# Collections
reports_col = db['reports']
stations_col = db['police_stations']
responses_col = db['responses']
hotspots_col = db['hotspots']
audit_logs_col = db['audit_logs']
settings_col = db['system_settings']
admin_col = db['admin_users']


def init_db():
    """Initialize database with indexes and default data"""
    try:
        # Create indexes for fast queries
        reports_col.create_index([('constituency', ASCENDING), ('created_at', DESCENDING)])
        reports_col.create_index([('status', ASCENDING)])
        reports_col.create_index([('spam_score', DESCENDING)])
        stations_col.create_index([('constituency', ASCENDING)], unique=True)
        stations_col.create_index([('username', ASCENDING)], unique=True)
        responses_col.create_index([('report_id', ASCENDING)])
        hotspots_col.create_index([('constituency', ASCENDING)])
        hotspots_col.create_index([('incident_count', DESCENDING)])
        audit_logs_col.create_index([('created_at', DESCENDING)])

        # Default settings - Only English and Kiswahili
        if settings_col.count_documents({}) == 0:
            settings_col.insert_one({
                'categories': ['Theft', 'Assault', 'Vandalism', 'Drug Activity', 'Traffic Violation', 'Robbery',
                               'Other'],
                'spam_threshold': 60,
                'auto_reject_threshold': 80,
                'critical_density_threshold': 10,
                'high_density_threshold': 6,
                'medium_density_threshold': 3,
                'trend_time_window': 7,
                'updated_at': datetime.now()
            })

        # Default admin
        if admin_col.count_documents({}) == 0:
            admin_col.insert_one({
                'username': 'admin_nakuru',
                'password_hash': generate_password_hash('secure_admin_2025'),
                'email': 'skmwangi@kabarak.ac.ke',
                'is_active': True,
                'created_at': datetime.now()
            })

        logger.info("✓ Safety App Database initialized successfully")
    except Exception as e:
        logger.error(f"✗ Database initialization error: {e}")


# REPORT FUNCTIONS
def add_report(category, description, manual_location, lat, lon, constituency, language, media_path, spam_result):
    """Create new incident report"""
    try:
        report = {
            'category': category,
            'description': description,
            'manual_location': manual_location,
            'lat': float(lat),
            'lon': float(lon),
            'constituency': constituency,
            'language': language,
            'media_path': media_path,
            'spam_score': spam_result['spam_score'],
            'spam_reasons': spam_result.get('reasons', []),
            'status': 'pending',
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }
        result = reports_col.insert_one(report)

        # Update hotspot
        hotspot = hotspots_col.find_one({'constituency': constituency, 'location': manual_location})
        if hotspot:
            hotspots_col.update_one(
                {'_id': hotspot['_id']},
                {'$inc': {'incident_count': 1}, '$set': {'last_incident': datetime.now()}}
            )
        else:
            hotspots_col.insert_one({
                'constituency': constituency,
                'location': manual_location,
                'lat': float(lat),
                'lon': float(lon),
                'incident_count': 1,
                'last_incident': datetime.now(),
                'created_at': datetime.now()
            })

        return result.inserted_id
    except Exception as e:
        logger.error(f"Error adding report: {e}")
        raise


def get_reports_for_station(constituency):
    """Get all reports with response data"""
    try:
        reports = list(reports_col.find({'constituency': constituency}).sort('created_at', -1).limit(500))

        for report in reports:
            report['id'] = str(report['_id'])
            report['short_id'] = str(report['_id'])[-8:]

            # Get response if exists
            response = responses_col.find_one({'report_id': report['_id']})
            if response:
                report['officer_name'] = response.get('officer_name')
                report['action_taken'] = response.get('action_taken')
                report['notes'] = response.get('notes')
            else:
                report['officer_name'] = None
                report['action_taken'] = None
                report['notes'] = None

        return reports
    except Exception as e:
        logger.error(f"Error getting reports: {e}")
        return []


def update_report_response(report_id, constituency, officer_name, notes, status, action_taken):
    """Update report with police response"""
    try:
        from bson.objectid import ObjectId

        report = reports_col.find_one({'_id': ObjectId(report_id)})
        if not report or report['constituency'] != constituency:
            raise ValueError("Report not found or unauthorized")

        station = stations_col.find_one({'constituency': constituency, 'is_active': True})
        if not station:
            raise ValueError(f"No active station found for {constituency}")

        # Update report status
        reports_col.update_one(
            {'_id': ObjectId(report_id)},
            {'$set': {'status': status, 'updated_at': datetime.now()}}
        )

        # Add or update response
        responses_col.update_one(
            {'report_id': ObjectId(report_id)},
            {'$set': {
                'report_id': ObjectId(report_id),
                'station_id': station['_id'],
                'officer_name': officer_name,
                'action_taken': action_taken,
                'notes': notes,
                'status': status,
                'created_at': datetime.now()
            }},
            upsert=True
        )
    except Exception as e:
        logger.error(f"Error updating report response: {e}")
        raise


# HOTSPOT FUNCTIONS
def get_hotspots_for_station(constituency):
    """Get crime hotspots for a constituency"""
    try:
        hotspots = list(
            hotspots_col.find({'constituency': constituency})
            .sort([('incident_count', -1), ('last_incident', -1)])
            .limit(100)
        )
        for hotspot in hotspots:
            hotspot['id'] = str(hotspot['_id'])
        return hotspots
    except Exception as e:
        logger.error(f"Error getting hotspots: {e}")
        return []


# POLICE STATION FUNCTIONS
def get_all_constituencies():
    """Get list of all active constituencies"""
    try:
        return [(station['constituency'],) for station in
                stations_col.find({'is_active': True}, {'constituency': 1}).sort('constituency', ASCENDING)]
    except Exception as e:
        logger.error(f"Error getting constituencies: {e}")
        return []


def add_police_station(constituency, username, password, preferred_language, contact_phone, contact_email):
    """Add new police station - Only English or Kiswahili"""
    try:
        if preferred_language not in ['English', 'Kiswahili']:
            preferred_language = 'English'

        stations_col.insert_one({
            'constituency': constituency,
            'username': username,
            'password_hash': generate_password_hash(password),
            'preferred_language': preferred_language,
            'contact_phone': contact_phone,
            'contact_email': contact_email,
            'is_active': True,
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        })
    except Exception as e:
        logger.error(f"Error adding police station: {e}")
        raise


def update_police_station(station_id, constituency, username, password_hash, preferred_language, contact_phone,
                          contact_email):
    """Update police station details"""
    try:
        from bson.objectid import ObjectId

        if preferred_language not in ['English', 'Kiswahili']:
            preferred_language = 'English'

        update_data = {
            'constituency': constituency,
            'username': username,
            'preferred_language': preferred_language,
            'contact_phone': contact_phone,
            'contact_email': contact_email,
            'updated_at': datetime.now()
        }

        if password_hash:
            update_data['password_hash'] = password_hash

        stations_col.update_one({'_id': ObjectId(station_id)}, {'$set': update_data})
    except Exception as e:
        logger.error(f"Error updating police station: {e}")
        raise


def verify_police_credentials(username, password):
    """Verify police login"""
    try:
        user = stations_col.find_one({'username': username, 'is_active': True})
        if user and check_password_hash(user['password_hash'], password):
            return {
                'constituency': user['constituency'],
                'preferred_language': user.get('preferred_language', 'English')
            }
        return None
    except Exception as e:
        logger.error(f"Error verifying police credentials: {e}")
        return None


def get_all_police_stations():
    """Get all police stations"""
    try:
        stations = list(stations_col.find({}).sort('constituency', ASCENDING))
        for station in stations:
            station['id'] = str(station['_id'])
        return stations
    except Exception as e:
        logger.error(f"Error getting police stations: {e}")
        return []


def deactivate_police_station(station_id):
    """Deactivate station"""
    try:
        from bson.objectid import ObjectId
        stations_col.update_one(
            {'_id': ObjectId(station_id)},
            {'$set': {'is_active': False, 'updated_at': datetime.now()}}
        )
    except Exception as e:
        logger.error(f"Error deactivating station: {e}")
        raise


def activate_police_station(station_id):
    """Activate station"""
    try:
        from bson.objectid import ObjectId
        stations_col.update_one(
            {'_id': ObjectId(station_id)},
            {'$set': {'is_active': True, 'updated_at': datetime.now()}}
        )
    except Exception as e:
        logger.error(f"Error activating station: {e}")
        raise


# ADMIN FUNCTIONS
def verify_admin_credentials(username, password):
    """Verify admin login"""
    try:
        user = admin_col.find_one({'username': username, 'is_active': True})
        if user and check_password_hash(user['password_hash'], password):
            return {'admin_id': str(user['_id'])}
        return None
    except Exception as e:
        logger.error(f"Error verifying admin credentials: {e}")
        return None


# SETTINGS FUNCTIONS
def get_system_settings():
    """Get current system settings"""
    try:
        settings = settings_col.find_one({})
        if settings:
            return {
                'categories': settings.get('categories', []),
                'spam_threshold': settings.get('spam_threshold', 60),
                'auto_reject_threshold': settings.get('auto_reject_threshold', 80),
                'critical_density_threshold': settings.get('critical_density_threshold', 10),
                'high_density_threshold': settings.get('high_density_threshold', 6),
                'medium_density_threshold': settings.get('medium_density_threshold', 3),
                'trend_time_window': settings.get('trend_time_window', 7),
                'emergency_number': settings.get('emergency_number', '0725646760')
            }
        return {
            'categories': ['Theft', 'Assault', 'Vandalism', 'Drug Activity', 'Traffic Violation', 'Robbery', 'Other'],
            'spam_threshold': 60,
            'auto_reject_threshold': 80,
            'critical_density_threshold': 10,
            'high_density_threshold': 6,
            'medium_density_threshold': 3,
            'trend_time_window': 7,
            'emergency_number': '0725646760'
        }
    except Exception as e:
        logger.error(f"Error getting system settings: {e}")
        return {}


def update_system_settings(categories, spam_threshold, auto_reject_threshold):
    """Update system settings"""
    try:
        settings_col.update_one(
            {},
            {'$set': {
                'categories': categories,
                'spam_threshold': spam_threshold,
                'auto_reject_threshold': auto_reject_threshold,
                'updated_at': datetime.now()
            }},
            upsert=True
        )
    except Exception as e:
        logger.error(f"Error updating system settings: {e}")
        raise


# STATISTICS FUNCTIONS
def get_constituency_statistics(constituency):
    """Get statistics for specific constituency"""
    try:
        total_reports = reports_col.count_documents({'constituency': constituency})
        pending_reports = reports_col.count_documents({'constituency': constituency, 'status': 'pending'})
        resolved_reports = reports_col.count_documents(
            {'constituency': constituency, 'status': {'$in': ['resolved', 'closed']}})

        yesterday = datetime.now() - timedelta(days=1)
        recent_reports = reports_col.count_documents({'constituency': constituency, 'created_at': {'$gte': yesterday}})

        # Average response time (in hours)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        pipeline = [
            {'$match': {'constituency': constituency, 'created_at': {'$gte': thirty_days_ago}}},
            {'$lookup': {'from': 'responses', 'localField': '_id', 'foreignField': 'report_id', 'as': 'response'}},
            {'$unwind': '$response'},
            {'$project': {'response_time': {'$divide': [{'$subtract': ['$response.created_at', '$created_at']}, 3600000]}}},
            {'$group': {'_id': None, 'avg_response_time': {'$avg': '$response_time'}}}
        ]

        result = list(reports_col.aggregate(pipeline))
        avg_response = round(result[0]['avg_response_time'], 2) if result else 0

        return {
            'total_reports': total_reports,
            'pending_reports': pending_reports,
            'resolved_reports': resolved_reports,
            'recent_reports': recent_reports,
            'avg_response_time': avg_response
        }
    except Exception as e:
        logger.error(f"Error getting constituency statistics: {e}")
        return {
            'total_reports': 0,
            'pending_reports': 0,
            'resolved_reports': 0,
            'recent_reports': 0,
            'avg_response_time': 0
        }


def get_system_statistics():
    """Get system-wide statistics"""
    try:
        total_reports = reports_col.count_documents({})
        pending_reports = reports_col.count_documents({'status': 'pending'})
        resolved_reports = reports_col.count_documents({'status': {'$in': ['resolved', 'closed']}})
        active_stations = stations_col.count_documents({'is_active': True})

        yesterday = datetime.now() - timedelta(days=1)
        recent_reports = reports_col.count_documents({'created_at': {'$gte': yesterday}})

        # Spam detection statistics
        spam_detected = reports_col.count_documents({'spam_score': {'$gte': 60}})

        # Average response time
        thirty_days_ago = datetime.now() - timedelta(days=30)
        pipeline = [
            {'$match': {'created_at': {'$gte': thirty_days_ago}}},
            {'$lookup': {'from': 'responses', 'localField': '_id', 'foreignField': 'report_id', 'as': 'response'}},
            {'$unwind': '$response'},
            {'$project': {'response_time': {'$divide': [{'$subtract': ['$response.created_at', '$created_at']}, 3600000]}}},
            {'$group': {'_id': None, 'avg_response_time': {'$avg': '$response_time'}}}
        ]

        result = list(reports_col.aggregate(pipeline))
        avg_response = round(result[0]['avg_response_time'], 2) if result else 0

        # Resolution rate
        if total_reports > 0:
            resolution_rate = round((resolved_reports / total_reports) * 100, 1)
        else:
            resolution_rate = 0

        # Reports today
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        reports_today = reports_col.count_documents({'created_at': {'$gte': today_start}})

        return {
            'total_reports': total_reports,
            'pending_reports': pending_reports,
            'resolved_reports': resolved_reports,
            'active_stations': active_stations,
            'recent_reports': recent_reports,
            'avg_response_time': avg_response,
            'spam_detected': spam_detected,
            'resolution_rate': resolution_rate,
            'reports_today': reports_today
        }
    except Exception as e:
        logger.error(f"Error getting system statistics: {e}")
        return {
            'total_reports': 0,
            'pending_reports': 0,
            'resolved_reports': 0,
            'active_stations': 0,
            'recent_reports': 0,
            'avg_response_time': 0,
            'spam_detected': 0,
            'resolution_rate': 0,
            'reports_today': 0
        }


# AUDIT LOG FUNCTIONS
def add_audit_log(user_type, username, action, details=None, ip_address=None):
    """Add audit log entry"""
    try:
        audit_logs_col.insert_one({
            'user_type': user_type,
            'username': username,
            'action': action,
            'details': details,
            'ip_address': ip_address,
            'created_at': datetime.now()
        })
    except Exception as e:
        logger.error(f"Failed to add audit log: {e}")


def get_audit_logs(limit=100, user_type=None):
    """Get audit logs with optional filtering"""
    try:
        query = {'user_type': user_type} if user_type else {}
        logs = list(audit_logs_col.find(query).sort('created_at', -1).limit(limit))
        for log in logs:
            log['id'] = str(log['_id'])
        return logs
    except Exception as e:
        logger.error(f"Error getting audit logs: {e}")
        return []