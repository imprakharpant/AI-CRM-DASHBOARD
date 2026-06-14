import os
import json
import logging
import google.generativeai as genai
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

# Config Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
is_gemini_available = False

if GEMINI_API_KEY and GEMINI_API_KEY.startswith("AIzaSy"):
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        # Use gemini-1.5-flash as default
        model = genai.GenerativeModel('gemini-1.5-flash')
        is_gemini_available = True
        logger.info("Gemini API successfully configured.")
    except Exception as e:
        logger.error(f"Error configuring Gemini: {e}")
else:
    logger.info("No valid Gemini API key found (key must start with 'AIzaSy'). Using local rule-based fallback.")

def get_gemini_model():
    if is_gemini_available:
        return genai.GenerativeModel('gemini-1.5-flash')
    return None

def parse_segment_prompt(prompt: str) -> Dict[str, Any]:
    """
    Parses a natural language segmentation prompt into filters:
    e.g., 'Bring back customers who have not purchased in 60 days and spent more than ₹5000'
    Returns: {"inactive_days": 60, "min_spend": 5000}
    """
    system_prompt = (
        "You are an AI data assistant. Parse the user's natural language marketing segmentation query "
        "and extract specific filter criteria. You must return a JSON object containing exactly two keys: "
        "'inactive_days' (integer, representing the minimum days since last purchase, or null if not mentioned) "
        "and 'min_spend' (float, representing the minimum total spend, or null if not mentioned). "
        "Ignore currency symbols and just parse numbers (e.g. ₹5000 becomes 5000).\n"
        "Do not include any explanation or markdown formatting. Output raw JSON only."
    )
    
    model = get_gemini_model()
    if model:
        try:
            full_prompt = f"{system_prompt}\n\nUser Query: \"{prompt}\"\n\nJSON Output:"
            # Set JSON MIME type for structured response
            response = model.generate_content(
                full_prompt,
                generation_config={"response_mime_type": "application/json"},
                request_options={"timeout": 5.0}
            )
            data = json.loads(response.text.strip())
            return {
                "inactive_days": data.get("inactive_days"),
                "min_spend": data.get("min_spend")
            }
        except Exception as e:
            logger.error(f"Gemini segmentation parse failed: {e}. Falling back to rule-based parsing.")
            
    # Mock/Rule-based Fallback (Simple Regex-like matching for common cases)
    import re
    inactive_days = None
    min_spend = None
    
    # Try parsing days
    days_matches = re.findall(r'(\d+)\s*days?', prompt, re.IGNORECASE)
    if days_matches:
        inactive_days = int(days_matches[0])
    
    # Try parsing spend amount (e.g., 5000 or ₹5000 or Rs. 5000)
    spend_matches = re.findall(r'(?:₹|rs\.?|spend(?:\s+more\s+than)?)\s*(\d+)', prompt, re.IGNORECASE)
    if spend_matches:
        min_spend = float(spend_matches[0])
    else:
        # Generic number matching for spend if days matches
        num_matches = re.findall(r'(?:over|above|>\s*|more\s+than\s*)\s*(?:₹|rs\.?)?\s*(\d+)', prompt, re.IGNORECASE)
        if num_matches:
            min_spend = float(num_matches[0])

    # Default values if parsing fails completely
    if inactive_days is None and min_spend is None:
        inactive_days = 60
        min_spend = 5000.0

    return {
        "inactive_days": inactive_days,
        "min_spend": min_spend
    }

import random

def generate_campaign_message(segment_description: str, angle: str, urgency: str, tone: str, channels: List[str]) -> Dict[str, Any]:
    """
    Generates a campaign message based on audience, angle, urgency, tone, and channels.
    Returns: {"message": "Generated message...", "channels": ["whatsapp", "email"], "subject": "optional subject"}
    """
    channels_str = ", ".join(channels)
    creativity_seed = random.randint(1, 100000)
    
    system_prompt = (
        f"You are a professional marketer. Generate a versatile, personalized marketing campaign message suitable for these channels: '{channels_str}'.\n"
        "You must return a JSON object with keys: "
        "'message' (string: the actual content, including placeholders like [Name] to personalize, and emojis if suitable for the channels and tone) "
        "and 'subject' (string: subject line, only if 'email' is one of the channels, otherwise null).\n"
        f"CRITICAL: Be extremely creative. Generate a COMPLETELY NEW and UNIQUE catchy slogan or hook. (Creativity Seed: {creativity_seed})\n"
        "Do not include any explanation or markdown formatting. Output raw JSON only."
    )
    
    user_prompt = (
        f"Audience/Segment: {segment_description}\n"
        f"Campaign Angle: {angle}\n"
        f"Urgency Level: {urgency}\n"
        f"Tone: {tone}\n"
        f"Channels: {channels_str}\n"
    )

    model = get_gemini_model()
    if model:
        try:
            full_prompt = f"{system_prompt}\n\nInput:\n{user_prompt}\n\nJSON Output:"
            response = model.generate_content(
                full_prompt,
                generation_config={"response_mime_type": "application/json"},
                request_options={"timeout": 5.0}
            )
            data = json.loads(response.text.strip())
            return {
                "message": data.get("message"),
                "channels": channels,
                "subject": data.get("subject")
            }
        except Exception as e:
            logger.error(f"Gemini message generation failed: {e}. Falling back to template.")

    # Mock/Template Fallback
    subject = f"Special Update: {angle}" if "email" in [c.lower() for c in channels] else None
    
    urgency_text = ""
    if urgency.lower() == "limited time":
      urgency_text = "This is only available for a limited time, so don't miss out!"
    elif urgency.lower() in ["urgent", "urgent/flash sale", "flash sale"]:
      urgency_text = "Hurry, this offer expires soon! Act fast!"
        
    # Introduce randomized slogans/hooks
    slogan_pool = [
        f"We wanted to share something special: {angle}",
        f"Just for you: {angle} is now live!",
        f"Unlock your exclusive access: {angle} is waiting for you!",
        f"We've missed you! Here is a little treat: {angle}",
        f"Celebrate today with a special surprise: {angle}",
        f"Ready for a refresh? Enjoy {angle} on your next checkout!"
    ]
    selected_slogan = random.choice(slogan_pool)

    templates = {
        "whatsapp": f"Hi [Name]! 👋 It's been a while since we saw you. *{selected_slogan}*! {urgency_text} Hope to see you soon! ✨",
        "sms": f"Hi [Name]! We miss you. {selected_slogan}. {urgency_text} Shop now: bit.ly/shop",
        "email": f"Hi [Name],\n\nWe haven't seen you in a while and we miss having you around!\n\n{selected_slogan}.\n\n{urgency_text}\n\nWarm regards,\nYour Favorite Brand Team",
        "rcs": f"Hey [Name]! 🌟 {selected_slogan}. {urgency_text} Tap below to shop!"
    }
    
    # Pick a template based on the first channel selected, or generic
    primary_channel = channels[0].lower() if channels else "whatsapp"
    message = templates.get(primary_channel, f"Hey [Name]! {selected_slogan}. {urgency_text}")
    
    # Adjust tone if requested
    if tone.lower() == "casual":
      message = message.replace("Warm regards,", "Cheers! ✌️").replace("Hi ", "Hey ")
    elif tone.lower() == "formal":
      message = message.replace("Hey ", "Dear ").replace("👋 ", "").replace("🎁 ", "").replace("✌️", "")
      if subject:
        subject = f"Exclusive Notification: {angle}"

    return {
        "message": message,
        "channels": channels,
        "subject": subject
    }

def generate_campaign_insights(metrics: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generates performance insights and recommendations for a campaign based on its metrics.
    Returns: {"summary": "A text summary...", "recommendations": ["rec1", "rec2", ...]}
    """
    system_prompt = (
        "You are an expert marketing analyst. Review the metrics for a marketing campaign and "
        "generate a brief performance summary and a list of actionable recommendations for future campaigns.\n"
        "You must return a JSON object with keys: "
        "'summary' (string: a concise, professional assessment of performance) "
        "and 'recommendations' (list of strings: 2-3 specific, actionable recommendations).\n"
        "Do not include any explanation or markdown formatting. Output raw JSON only."
    )
    
    user_prompt = json.dumps(metrics)

    model = get_gemini_model()
    if model:
        try:
            full_prompt = f"{system_prompt}\n\nCampaign Metrics:\n{user_prompt}\n\nJSON Output:"
            response = model.generate_content(
                full_prompt,
                generation_config={"response_mime_type": "application/json"},
                request_options={"timeout": 5.0}
            )
            data = json.loads(response.text.strip())
            return {
                "summary": data.get("summary"),
                "recommendations": data.get("recommendations", [])
            }
        except Exception as e:
            logger.error(f"Gemini insights generation failed: {e}. Falling back to default insights.")

    # Mock Fallback
    sent = metrics.get("sent", 0)
    delivered = metrics.get("delivered", 0)
    opened = metrics.get("opened", 0)
    read = metrics.get("read", 0)
    clicked = metrics.get("clicked", 0)
    failed = metrics.get("failed", 0)
    conversions = metrics.get("conversions", 0)
    
    delivery_rate = (delivered / sent * 100) if sent > 0 else 0
    open_rate = (opened / delivered * 100) if delivered > 0 else 0
    read_rate = (read / opened * 100) if opened > 0 else 0
    click_rate = (clicked / read * 100) if read > 0 else 0
    conversion_rate = (conversions / clicked * 100) if clicked > 0 else 0

    summary = f"This campaign reached {delivered} customers out of {sent} attempted dispatches, resulting in a delivery rate of {delivery_rate:.1f}%. "
    
    if open_rate > 50:
        summary += f"We observed strong engagement with a {open_rate:.1f}% open rate and {read_rate:.1f}% read rate. "
    else:
        summary += f"Engagement was moderate with an open rate of {open_rate:.1f}% and read rate of {read_rate:.1f}%. "
        
    summary += f"A total of {conversions} conversions (orders) were generated directly from clicked links."

    recommendations = []
    if delivery_rate < 85:
        recommendations.append("Update contact list details: A high failure rate suggests invalid phone numbers or emails. Implement a verification step during customer sign-ups.")
    if open_rate < 30:
        recommendations.append("Optimise subject lines/initial copy: Test more compelling hook messages or personalized offers to increase initial open rates.")
    if click_rate < 15:
        recommendations.append("Enhance Call to Action: The message content got read, but users didn't click. Make the offer link clearer and more urgent.")
    if conversion_rate < 5:
        recommendations.append("Smooth the Landing Page experience: Customers clicked the link but did not purchase. Ensure the landing page is responsive, displays the discount immediately, and offers a friction-free checkout.")

    if not recommendations:
        recommendations = [
            "Scale this segment: This campaign performed exceptionally well. Consider targeting a wider audience with a similar offer.",
            "A/B test delivery times: Try scheduling the next campaign at different hours of the day to see if read speeds can be optimized further."
        ]

    return {
        "summary": summary,
        "recommendations": recommendations[:3]
    }
