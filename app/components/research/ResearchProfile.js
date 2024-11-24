import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { Loader2 } from 'lucide-react';
import TechnologyAffinityScale from './TechnologyAffinityScale';
import { toast } from 'react-toastify';

const AGE_GROUPS = [
  "18-20",
  "21-23",
  "24-26",
  "27-29",
  "30+"
];

const YEAR_GROUPS = [
  { value: "2", label: "Year 2" },
  { value: "3", label: "Year 3" },
  { value: "4", label: "Year 4" },
  { value: "5", label: "Year 5" }
];

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" }
];

const ETHNICITY_OPTIONS = [
  { value: "asian_british", label: "Asian or Asian British" },
  { value: "black_british", label: "Black, African, Caribbean or Black British" },
  { value: "mixed", label: "Mixed or Multiple ethnic groups" },
  { value: "white", label: "White" },
  { value: "other", label: "Other ethnic group" },
  { value: "prefer_not_to_say", label: "Prefer not to say" }
];

export default function ResearchProfile() {
  const { user } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    yearGroup: '',
    ageGroup: '',
    gender: '',
    ethnicity: '',
    atiScore: null
  });

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleATIComplete = useCallback((score) => {
    setProfileData(prev => {
      if (prev.atiScore === score) return prev;
      return {
        ...prev,
        atiScore: score
      };
    });
  }, []);

  const saveProfileData = async () => {
    try {
      setLoading(true);
      console.log('Starting profile save...'); // Debug log
      console.log('User data:', user); // Debug log
  
      if (!user?.uid) {
        toast.error('Authentication error. Please try logging in again.');
        return;
      }
  
      // First, ensure user is marked as research participant
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        role: 'research_participant',
        lastUpdated: new Date()
      });
  
      // Generate a new anonymous ID if one doesn't exist
      const anonymousId = user.anonymousId || `RP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log('Using anonymousId:', anonymousId); // Debug log
  
      // Update user document with anonymous ID if needed
      if (!user.anonymousId) {
        console.log('Updating user with new anonymousId...'); // Debug log
        await updateDoc(userRef, {
          anonymousId: anonymousId
        });
      }
  
      // Save to research participants collection
      console.log('Saving research participant data...'); // Debug log
      await setDoc(doc(db, 'research_participants', anonymousId), {
        ...profileData,
        userId: user.uid,
        createdAt: new Date(),
        lastUpdated: new Date()
      });
  
      // Mark profile as complete
      console.log('Marking profile as complete...'); // Debug log
      await updateDoc(userRef, {
        profileComplete: true,
        lastUpdated: new Date()
      });
  
      console.log('Profile saved successfully'); // Debug log
      toast.success('Profile saved successfully');
      router.push('/dashboard');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Error saving profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const isStepComplete = (step) => {
    switch (step) {
      case 1:
        return profileData.yearGroup && profileData.ageGroup;
      case 2:
        return profileData.gender && profileData.ethnicity;
      case 3:
        return profileData.atiScore !== null;
      default:
        return false;
    }
  };

  const handleContinueClick = async () => {
    console.log('Continue button clicked', {
      currentStep,
      isComplete: isStepComplete(currentStep),
      profileData
    });

    if (currentStep === 3 && isStepComplete(currentStep)) {
      await saveProfileData();
    } else if (isStepComplete(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-primary">Academic Information</h2>
              <p className="text-gray-600 mt-1">Please provide your academic year and age group.</p>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Year Group</label>
                <div className="grid grid-cols-2 gap-4">
                  {YEAR_GROUPS.map((year) => (
                    <button
                      key={year.value}
                      type="button"
                      onClick={() => handleInputChange('yearGroup', year.value)}
                      className={`p-4 rounded-lg border transition-colors ${
                        profileData.yearGroup === year.value
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white hover:bg-gray-50 border-gray-200'
                      }`}
                    >
                      {year.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Age Group</label>
                <div className="grid grid-cols-2 gap-4">
                  {AGE_GROUPS.map((age) => (
                    <button
                      key={age}
                      type="button"
                      onClick={() => handleInputChange('ageGroup', age)}
                      className={`p-4 rounded-lg border transition-colors ${
                        profileData.ageGroup === age
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white hover:bg-gray-50 border-gray-200'
                      }`}
                    >
                      {age}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-primary">Demographics</h2>
              <p className="text-gray-600 mt-1">
                This information helps us understand the diversity of our research participants.
                All responses are optional and will be stored anonymously.
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Gender</label>
                <div className="grid grid-cols-2 gap-4">
                  {GENDER_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleInputChange('gender', option.value)}
                      className={`p-4 rounded-lg border transition-colors ${
                        profileData.gender === option.value
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white hover:bg-gray-50 border-gray-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ethnicity</label>
                <div className="grid grid-cols-2 gap-4">
                  {ETHNICITY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleInputChange('ethnicity', option.value)}
                      className={`p-4 rounded-lg border transition-colors ${
                        profileData.ethnicity === option.value
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white hover:bg-gray-50 border-gray-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return <TechnologyAffinityScale onComplete={handleATIComplete} />;

      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">Research Profile</h1>
        <p className="text-gray-600 mt-2">
          Please complete your research participant profile. This information helps us 
          understand how different students engage with the AI virtual patient system.
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`flex items-center ${
                step < currentStep
                  ? 'text-primary'
                  : step === currentStep
                  ? 'text-primary'
                  : 'text-gray-400'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step < currentStep
                    ? 'bg-primary text-white'
                    : step === currentStep
                    ? 'bg-primary text-white'
                    : 'bg-gray-200'
                }`}
              >
                {step < currentStep ? '✓' : step}
              </div>
              <span className="ml-2 text-sm font-medium">
                {step === 1 ? 'Academic' : step === 2 ? 'Demographics' : 'Technology'}
              </span>
            </div>
          ))}
        </div>
        <div className="relative h-2 bg-gray-200 rounded-full">
          <div
            className="absolute h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {renderStep()}
        <div className="p-6 bg-gray-50 flex justify-between">
          <button
            type="button"
            onClick={() => setCurrentStep(prev => prev - 1)}
            disabled={currentStep === 1 || loading}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleContinueClick}
            disabled={!isStepComplete(currentStep) || loading}
            className="btn btn-primary flex items-center"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {currentStep === 3 ? 'Complete Profile' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}