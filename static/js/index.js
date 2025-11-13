// Index Page JavaScript
function trackReport() {
    const reportId = document.getElementById('reportId').value.trim();
    if (!reportId) {
        alert('Please enter a report reference number');
        return;
    }

    document.getElementById('reportResult').classList.remove('show');
    document.getElementById('notFoundMessage').style.display = 'none';

    fetch(`/api/track_report/${reportId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('resultId').textContent = data.report.short_id || reportId;
                document.getElementById('resultCategory').textContent = data.report.category;
                document.getElementById('resultLocation').textContent = data.report.manual_location;
                document.getElementById('resultDate').textContent = new Date(data.report.created_at).toLocaleDateString();

                const statusBadge = `<span class="status-badge status-${data.report.status}">${data.report.status.toUpperCase()}</span>`;
                document.getElementById('resultStatus').innerHTML = statusBadge;

                if (data.report.officer_name) {
                    document.getElementById('responseSection').style.display = 'block';
                    document.getElementById('resultOfficer').textContent = data.report.officer_name || 'N/A';
                    document.getElementById('resultAction').textContent = data.report.action_taken || 'N/A';
                    document.getElementById('resultNotes').textContent = data.report.notes || 'No additional notes';
                } else {
                    document.getElementById('responseSection').style.display = 'none';
                }

                document.getElementById('reportResult').classList.add('show');
            } else {
                document.getElementById('notFoundMessage').style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('notFoundMessage').style.display = 'block';
        });
}

document.getElementById('reportId').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') trackReport();
});