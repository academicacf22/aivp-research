import './globals.css'
import { Inter } from 'next/font/google'
import { AuthProvider } from './contexts/AuthContext'
import { ChatProvider } from './contexts/ChatContext'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'CLERKtheAI',
  description: 'Case-based Learning to Enhance Reasoning at Keele using AI',
  keywords: ['medical education', 'virtual patient', 'AI', 'clinical training', 'research'],
  authors: [{ name: 'Aditya Narain' }],
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon-192x192.png',
    shortcut: '/favicon-96x96.png'
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-background">
        <AuthProvider>
          <ChatProvider>
            {children}
            <ToastContainer />
          </ChatProvider>
        </AuthProvider>
      </body>
    </html>
  )
}