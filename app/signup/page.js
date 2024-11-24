import SignupForm from '../components/auth/SignupForm';
import Image from 'next/image';

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-white shadow py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Image
            src="/university-logo.png"
            alt="University Logo"
            width={150}
            height={40}
            className="h-10 w-auto"
          />
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center p-4">
        <SignupForm />
      </main>
    </div>
  );
}