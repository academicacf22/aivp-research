// Environment Configuration Utility
export const config = {
    // OpenAI Configuration
    openai: {
      apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
      model: process.env.NEXT_PUBLIC_OPENAI_MODEL || 'gpt-3.5-turbo',
    },
    
    // Firebase Configuration
    firebase: {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    },
  
    // Verify required environment variables are set
    verify() {
      const required = [
        'NEXT_PUBLIC_OPENAI_API_KEY',
        'NEXT_PUBLIC_FIREBASE_API_KEY',
        'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
        'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
        'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
        'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
        'NEXT_PUBLIC_FIREBASE_APP_ID',
      ];
  
      const missing = required.filter(key => !process.env[key]);
  
      if (missing.length > 0) {
        throw new Error(
          `Missing required environment variables:\n${missing.join('\n')}\n` +
          'Please check your .env.local file or environment configuration.'
        );
      }
  
      return true;
    }
  };