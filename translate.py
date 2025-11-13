import logging
import time
from functools import lru_cache

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Language mapping
LANG_MAP = {'en': 'en', 'sw': 'sw', 'ki': 'sw', 'kikuyu': 'sw'}


def detect_language(text: str) -> str:
    """
    Detect language using enhanced heuristic analysis
    Returns: 'en' for English, 'sw' for Swahili/Kiswahili
    """
    if not text or not text.strip():
        return 'en'

    text = text.strip()

    # Try deep-translator first
    try:
        from deep_translator import single_detection
        detected = single_detection(text, api_key=None)
        if detected:
            detected_lower = detected.lower()
            # Map various codes to our supported languages
            if detected_lower in ('sw', 'swahili', 'kiswahili'):
                return 'sw'
            elif detected_lower in ('en', 'english'):
                return 'en'
    except Exception as e:
        logger.warning(f"Deep-translator detection failed: {e}")

    # Enhanced heuristic fallback
    text_lower = text.lower()

    # Expanded Swahili word list (common words and phrases)
    swahili_words = [
        # Common verbs
        'ni', 'na', 'wa', 'kwa', 'ya', 'cha', 'za',
        # Pronouns
        'mimi', 'wewe', 'yeye', 'sisi', 'ninyi', 'wao',
        # Common words
        'hii', 'hiyo', 'hizo', 'yule', 'huyu', 'wale', 'hawa',
        'watu', 'mtu', 'kitu', 'vitu', 'mahali', 'wakati',
        # Police/Crime related
        'polisi', 'usalama', 'tukio', 'uhalifu', 'ajali',
        # Common phrases
        'tafadhali', 'asante', 'habari', 'jambo', 'karibu', 'samahani',
        # Time
        'sasa', 'leo', 'jana', 'kesho', 'juzi', 'asubuhi', 'jioni',
        # Location
        'hapa', 'pale', 'kule', 'karibu', 'mbali',
        # Action words
        'kuna', 'hakuna', 'ndiyo', 'hapana', 'kwamba', 'lakini',
        # Possessives
        'yake', 'yangu', 'yako', 'yetu', 'yenu', 'yao',
        # Other common
        'nimewona', 'nimesikia', 'ninaomba', 'nataka', 'nina',
        'ameua', 'ameibiwa', 'amelipuka', 'amepigwa'
    ]

    # English indicator words (words that rarely appear in Swahili)
    english_indicators = [
        'the', 'and', 'are', 'was', 'were', 'been', 'being',
        'have', 'has', 'had', 'having', 'can', 'could', 'would',
        'should', 'will', 'shall', 'may', 'might', 'must',
        'this', 'that', 'these', 'those', 'there', 'where',
        'what', 'when', 'why', 'how', 'which', 'who', 'whom'
    ]

    # Split into words and clean
    words = text_lower.split()
    total_words = len(words)

    if total_words == 0:
        return 'en'

    # Count Swahili and English indicators
    swahili_count = 0
    english_count = 0

    for word in words:
        # Remove punctuation for matching
        clean_word = ''.join(c for c in word if c.isalnum())

        if clean_word in swahili_words:
            swahili_count += 1

        if clean_word in english_indicators:
            english_count += 1

    # Calculate percentages
    swahili_percentage = (swahili_count / total_words) * 100
    english_percentage = (english_count / total_words) * 100

    # Decision logic
    # If we have strong Swahili indicators (2+ words or 20%+)
    if swahili_count >= 2 or swahili_percentage >= 20:
        logger.info(f"Detected Swahili: {swahili_count} words ({swahili_percentage:.1f}%)")
        return 'sw'

    # If we have strong English indicators
    if english_count >= 3 or english_percentage >= 30:
        logger.info(f"Detected English: {english_count} words ({english_percentage:.1f}%)")
        return 'en'

    # Check for common Swahili patterns
    swahili_patterns = [
        r'\bni\s+\w+',  # "ni watu", "ni kitu"
        r'\bna\s+\w+',  # "na watu"
        r'\bkwa\s+\w+',  # "kwa sababu"
        r'\bya\s+\w+',  # "ya watu"
        r'(ame|ana|ta)\w+',  # Swahili verb prefixes
        r'\w+(ni|na|li|wa|ya|cha|za)$'  # Common Swahili suffixes
    ]

    import re
    swahili_pattern_matches = 0
    for pattern in swahili_patterns:
        if re.search(pattern, text_lower):
            swahili_pattern_matches += 1

    if swahili_pattern_matches >= 2:
        logger.info(f"Detected Swahili via patterns: {swahili_pattern_matches} matches")
        return 'sw'

    # Default to English
    logger.info(f"Defaulting to English (sw={swahili_count}, en={english_count})")
    return 'en'


def safe_translate(text, src='auto', dest='en', retries=3):
    """ROBUST TRANSLATION using deep-translator"""
    if not text or not text.strip():
        return text

    text = ' '.join(text.split())

    for attempt in range(retries):
        try:
            from deep_translator import GoogleTranslator
            translator = GoogleTranslator(source=src, target=dest)
            result = translator.translate(text)
            if result:
                return result
        except Exception as e:
            logger.warning(f"Translation attempt {attempt + 1} failed: {e}")
            if attempt < retries - 1:
                time.sleep(2 ** attempt)

    return "[Translation unavailable]"


@lru_cache(maxsize=200)
def translate_text(text, target_lang):
    """SMART TRANSLATION with automatic language detection"""
    if not text or not text.strip():
        return text

    target = LANG_MAP.get(target_lang.lower(), 'en')
    src_lang = detect_language(text)

    if src_lang in ('ki', 'kikuyu'):
        src_lang = 'sw'

    if src_lang == target:
        return text

    return safe_translate(text, src=src_lang, dest=target)


def translate_report(report_dict, target_lang):
    """BATCH TRANSLATION: Translates all fields in a report"""
    if not report_dict:
        return {}

    translated = {}
    for key, value in report_dict.items():
        if not value:
            translated[key] = value
            continue

        try:
            translated[key] = translate_text(str(value), target_lang)
        except:
            translated[key] = value

    return translated


# Test function
if __name__ == "__main__":
    print("\n=== Testing Translation Module ===\n")

    # Test language detection
    test_texts = [
        "There is a robbery at the market",
        "Kuna wezi wamevunja duka la Nakuru",
        "Polisi wanahitajika haraka"
    ]

    for text in test_texts:
        detected = detect_language(text)
        print(f"Text: {text}")
        print(f"Detected: {detected}\n")

    # Test translation
    english_text = "Emergency situation at the hospital"
    swahili_text = translate_text(english_text, 'sw')
    print(f"English: {english_text}")
    print(f"Swahili: {swahili_text}")