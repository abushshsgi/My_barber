from django.http import HttpResponse


PRIVACY_POLICY_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy - Mysaloon</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }
        h1 {
            color: #111;
            border-bottom: 2px solid #111;
            padding-bottom: 10px;
        }
        h2 {
            color: #333;
            margin-top: 30px;
        }
        .updated {
            color: #666;
            font-size: 14px;
            margin-bottom: 20px;
        }
        ul {
            padding-left: 20px;
        }
        li {
            margin-bottom: 8px;
        }
        a {
            color: #0066cc;
        }
    </style>
</head>
<body>
    <h1>Privacy Policy</h1>
    <p class="updated">This privacy policy is effective as of 2026-10-22</p>
    <p>This privacy policy applies to the Mysaloon app for mobile devices and web browsers, together with any related services operated by Abdurahim Oripov (collectively, the "Application"). Abdurahim Oripov is hereby referred to as the "Service Provider".</p>
    
    <h2>Information Collection and Use</h2>
    <p>The Application collects information when you download and use it. This information may include information such as:</p>
    <ul>
        <li>Your device's Internet Protocol address</li>
        <li>The pages of the Application that you visit, the time and date of your visit, the time spent on those pages</li>
        <li>The time spent on the Application</li>
        <li>Your operating system you use</li>
    </ul>
    
    <h2>Cookies and tracking technologies</h2>
    <p>The Application or its third-party SDKs may use cookies, SDKs, pixels, and similar technologies to support functionality, analytics, or service delivery. Where required by applicable law, the Service Provider will obtain consent before using non-essential tracking technologies.</p>
    
    <h2>Location Information</h2>
    <p>The Application collects your device's location to provide location-based features, improve the Application, and support related services.</p>
    <ul>
        <li>Geolocation Services: The Service Provider may use location data to provide location-based features or content.</li>
        <li>Analytics and Improvements: Aggregated location data may help the Service Provider understand usage patterns and improve performance.</li>
        <li>Third-Party Services: Location data may be shared with third-party services used to support Application functionality, subject to this privacy policy and applicable law.</li>
    </ul>
    
    <h2>Your Rights</h2>
    <p>You may request access to, correction of, or deletion of your personal data held by the Service Provider. To exercise these rights, or to withdraw consent where processing is based on consent, contact the Service Provider at help@mysaloon.uz.</p>
    
    <h2>Your California privacy rights (CCPA/CPRA)</h2>
    <p>If you are a California resident, you have the right to know what personal information is collected, the right to delete personal information, the right to opt out of the sale or sharing of personal information, and the right to non-discrimination for exercising these rights. To exercise your CCPA/CPRA rights, contact the Service Provider at help@mysaloon.uz.</p>
    
    <h2>Artificial Intelligence</h2>
    <p>The Application uses Artificial Intelligence (AI) technologies to enhance user experience and provide certain features. The AI components may process user data to deliver personalized content, recommendations, or automated functionalities. All AI processing is performed in accordance with this privacy policy and applicable laws. If you have questions about the AI features or data processing, please contact the Service Provider.</p>
    
    <h2>Marketing Communications</h2>
    <p>The Service Provider may use the information you provide to send important information, required notices, and, where permitted by law, marketing communications.</p>
    
    <h2>Required Information</h2>
    <p>For a better experience while using the Application, the Service Provider may require you to provide certain personally identifiable information, including but not limited to Name, Phone number, Email address, AI interaction data. The information the Service Provider requests will be retained and used as described in this privacy policy.</p>
    
    <h2>Third Party Access</h2>
    <p>Only aggregated, anonymized data is periodically transmitted to external services to aid the Service Provider in improving the Application and their service. The Service Provider may share your information with third parties in the ways that are described in this privacy statement.</p>
    
    <h2>International Data Transfers</h2>
    <p>The Service Provider or its third-party service providers may transfer personal data to countries outside your country of residence, including outside the European Economic Area (EEA). Where applicable law requires safeguards for international transfers, the Service Provider will use appropriate mechanisms.</p>
    <ul>
        <li>Standard Contractual Clauses (SCCs) approved by the European Commission</li>
        <li>Adequacy decisions or other legally recognized transfer mechanisms</li>
        <li>Your consent, where required and legally permitted</li>
    </ul>
    
    <h2>Third Party Privacy Policies</h2>
    <p>Please note that the Application utilizes third-party services that have their own Privacy Policy about handling data. Below are the links to the Privacy Policy of the third-party service providers used by the Application:</p>
    <ul>
        <li><a href="https://www.google.com/policies/privacy/">Google Play Services</a></li>
        <li><a href="https://firebase.google.com/support/privacy">Google Analytics for Firebase</a></li>
    </ul>
    
    <h2>Disclosure</h2>
    <p>The Service Provider may disclose User Provided and Automatically Collected Information:</p>
    <ul>
        <li>as required by law, such as to comply with a subpoena, or similar legal process</li>
        <li>when they believe in good faith that disclosure is necessary to protect their rights, protect your safety or the safety of others, investigate fraud, or respond to a government request</li>
        <li>with their trusted services providers who work on their behalf, do not have an independent use of the information the Service Provider discloses to them, and have agreed to adhere to the rules set forth in this privacy statement</li>
    </ul>
    
    <h2>Opt-Out Rights</h2>
    <p>You can stop further collection of information from your mobile device or computer by uninstalling the Application. Uninstalling will stop the Application from collecting data from your device, but it does not automatically delete information that has already been transmitted to the Service Provider or to third parties.</p>
    <ul>
        <li>You can stop further collection of information from your device by ceasing to use the website. Ceasing to use will stop the website from collecting data from your device, but it does not automatically delete information that has already been transmitted to the Service Provider or to third parties.</li>
        <li>To request deletion of your personal data, to withdraw consent, or to exercise any of your rights, contact the Service Provider at help@mysaloon.uz.</li>
    </ul>
    
    <h2>Data Retention Policy</h2>
    <p>The Service Provider retains personal data based on its necessity for the stated purposes:</p>
    <ul>
        <li>User Provided Data: Retained for the duration of your use of the Application plus 12 months thereafter, unless longer retention is required by law</li>
        <li>Automatically Collected Data: Retained for up to 24 months from collection, unless longer retention is required for legal compliance</li>
        <li>Aggregated and Anonymized Data: Retained indefinitely as it no longer identifies you</li>
        <li>Data required for legal compliance: Retained as long as required by applicable law</li>
    </ul>
    
    <h2>Data Deletion</h2>
    <p>You can request deletion of your personal data or account by contacting the Service Provider at help@mysaloon.uz. The Service Provider will process your request within the timeframes required by applicable law. Upon verification of your identity, the Service Provider will delete your personal data from its systems, except where retention is required for legal compliance or legitimate business purposes.</p>
    
    <h2>Children</h2>
    <p>The Application is not intended for children under 13 years of age, or such higher age as required by applicable law. The Service Provider does not knowingly solicit data from children or market the Application to them. Where parental or guardian consent is required under applicable law, the Application is not intended for use without that consent. The Service Provider does not knowingly collect personally identifiable information from children under 13 years of age in violation of applicable law. In the event the Service Provider discovers that a child has provided personal information, the Service Provider will immediately delete this from their servers. If you are a parent or guardian and you are aware that your child has provided the Service Provider with personal information, please contact the Service Provider (help@mysaloon.uz) so that they will be able to take the necessary actions.</p>
    
    <h2>Security</h2>
    <p>The Service Provider is concerned about safeguarding the confidentiality of your information. The Service Provider provides physical, electronic, and procedural safeguards to protect information the Service Provider processes and maintains.</p>
    
    <h2>Data Breach Notification</h2>
    <p>If a data breach occurs that affects your personal data, the Service Provider will notify you in accordance with applicable legal requirements, including, where required, providing information about the nature of the breach and the steps being taken to address it.</p>
    
    <h2>Changes</h2>
    <p>The Service Provider may update this Privacy Policy from time to time. The Service Provider will notify you of material changes by posting the updated Privacy Policy with an effective date. Where required by law, the Service Provider will seek your consent to material changes before they take effect. Previous versions of this Privacy Policy will be maintained and made available upon request by contacting the Service Provider at help@mysaloon.uz.</p>
    
    <h2>Your Consent</h2>
    <p>Where processing is based on consent, you provide that consent by affirmatively opting in to the relevant feature or action. You may withdraw consent at any time without affecting processing carried out before withdrawal. Processing based on other lawful bases is carried out as described above.</p>
    
    <h2>Contact Us</h2>
    <p>If you have any questions regarding privacy while using the Application, or have questions about the practices, please contact the Service Provider via email at <a href="mailto:help@mysaloon.uz">help@mysaloon.uz</a>.</p>
    
    <h2>Privacy Policy Generator</h2>
    <p>This privacy policy page was generated by <a href="https://app-privacy-policy-generator.nisrulz.com/">App Privacy Policy Generator</a>.</p>
</body>
</html>
"""


TERMS_OF_USE_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terms of Use - Mysaloon</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }
        h1 {
            color: #111;
            border-bottom: 2px solid #111;
            padding-bottom: 10px;
        }
        h2 {
            color: #333;
            margin-top: 30px;
        }
        .updated {
            color: #666;
            font-size: 14px;
            margin-bottom: 20px;
        }
        ul {
            padding-left: 20px;
        }
        li {
            margin-bottom: 8px;
        }
        a {
            color: #0066cc;
        }
    </style>
</head>
<body>
    <h1>Terms of Use</h1>
    <p class="updated">These terms of use are effective as of 2026-10-22</p>
    <p>These terms of use apply to the Mysaloon app for mobile devices and web browsers, together with any related services operated by Abdurahim Oripov (collectively, the "Application"). Abdurahim Oripov is hereby referred to as the "Service Provider".</p>
    
    <h2>Acceptance of Terms</h2>
    <p>By downloading, accessing, or using the Application, you agree to be bound by these Terms of Use. If you do not agree to these terms, you must not use the Application.</p>
    
    <h2>Eligibility</h2>
    <p>You must be at least 13 years of age to use the Application. By using the Application, you represent and warrant that you are at least 13 years old and have the legal capacity to enter into these terms.</p>
    
    <h2>License to Use</h2>
    <p>The Service Provider grants you a limited, non-exclusive, non-transferable, revocable license to use the Application for personal, non-commercial purposes in accordance with these terms.</p>
    
    <h2>User Responsibilities</h2>
    <p>You agree to use the Application only for lawful purposes and in accordance with these Terms of Use. You must not:</p>
    <ul>
        <li>Use the Application for any illegal or unauthorized purpose</li>
        <li>Interfere with or disrupt the Application or servers</li>
        <li>Attempt to gain unauthorized access to any part of the Application</li>
        <li>Share your account credentials with others</li>
        <li>Use the Application to harass, abuse, or harm others</li>
    </ul>
    
    <h2>Account Security</h2>
    <p>You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account. You agree to notify the Service Provider immediately of any unauthorized use of your account.</p>
    
    <h2>Content and User Data</h2>
    <p>You retain ownership of any content you submit to the Application. By submitting content, you grant the Service Provider a worldwide, non-exclusive, royalty-free license to use, reproduce, and display the content solely for the purpose of providing the Application services.</p>
    
    <h2>Artificial Intelligence Features</h2>
    <p>The Application includes AI-powered features such as style recommendations, face analysis, and virtual try-on. By using these features, you acknowledge that:</p>
    <ul>
        <li>AI recommendations are based on algorithms and may not always be accurate</li>
        <li>The Service Provider is not responsible for decisions made based on AI suggestions</li>
        <li>Your images and data may be processed to improve AI accuracy</li>
    </ul>
    
    <h2>Location Services</h2>
    <p>The Application may request access to your device's location to provide location-based features such as finding nearby barbers. You can disable location services in your device settings, which may affect certain Application features.</p>
    
    <h2>Bookings and Payments</h2>
    <p>When you book appointments through the Application, you agree to:</p>
    <ul>
        <li>Provide accurate and complete information</li>
        <li>Arrive on time for scheduled appointments</li>
        <li>Follow the barber's cancellation policy</li>
        <li>Pay any applicable fees for missed appointments</li>
    </ul>
    
    <h2>Third-Party Services</h2>
    <p>The Application may integrate with third-party services such as payment processors, mapping services, and social media platforms. Your use of these services is subject to their respective terms and privacy policies.</p>
    
    <h2>Termination</h2>
    <p>The Service Provider reserves the right to suspend or terminate your access to the Application at any time, with or without cause, with or without notice. Upon termination, your right to use the Application will immediately cease.</p>
    
    <h2>Disclaimers</h2>
    <p>The Application is provided on an "as is" and "as available" basis without warranties of any kind, either express or implied. The Service Provider does not warrant that the Application will be uninterrupted, secure, or error-free.</p>
    
    <h2>Limitation of Liability</h2>
    <p>To the maximum extent permitted by law, the Service Provider shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Application.</p>
    
    <h2>Intellectual Property</h2>
    <p>The Application and its original content, features, and functionality are owned by the Service Provider and are protected by international copyright, trademark, and other intellectual property laws.</p>
    
    <h2>Changes to Terms</h2>
    <p>The Service Provider may update these Terms of Use from time to time. Continued use of the Application after changes constitutes acceptance of the updated terms.</p>
    
    <h2>Governing Law</h2>
    <p>These Terms of Use shall be governed by and construed in accordance with the laws of the Republic of Uzbekistan, without regard to its conflict of law provisions.</p>
    
    <h2>Contact Us</h2>
    <p>If you have any questions about these Terms of Use, please contact the Service Provider at <a href="mailto:help@mysaloon.uz">help@mysaloon.uz</a>.</p>
</body>
</html>
"""


def privacy_policy(request):
    """Privacy Policy page for Google Play Store compliance."""
    return HttpResponse(PRIVACY_POLICY_HTML, content_type="text/html")


def terms_of_use(request):
    """Terms of Use page for Google Play Store compliance."""
    return HttpResponse(TERMS_OF_USE_HTML, content_type="text/html")

