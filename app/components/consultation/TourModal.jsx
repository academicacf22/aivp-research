'use client';

import { useState } from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  X,
  MessageSquare,
  MessageCircle,
  Zap,
  Clock
} from 'lucide-react';
import { Button } from '../ui/button';

const TOUR_STEPS = [
  {
    title: "Welcome to Virtual Patient Consultation",
    description: "This guided tour will help you understand how to use the consultation interface effectively.",
    image: <MessageSquare className="h-12 w-12 text-primary" />
  },
  {
    title: "Chat Interface",
    description: "This is where you'll interact with the virtual patient. Type your questions and responses in the input field at the bottom.",
    image: <MessageCircle className="h-12 w-12 text-primary" />
  },
  {
    title: "Quick Actions",
    description: "Click on the button on the right when you're ready to discuss the diagnosis. Once you've finished your consultation, you can ask for feedback and discuss other questions you could have asked. You can end the consultation at any time.",
    image: <Zap className="h-12 w-12 text-primary" />
  },
  {
    title: "Session Timer",
    description: "Keep track of your consultation duration with the timer in the top right corner. When you end the consultation, you will be able to save a PDF of the interaction.",
    image: <Clock className="h-12 w-12 text-primary" />
  }
];

export default function TourModal({ onClose }) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-lg w-full mx-4 overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-primary">
            Getting Started ({currentStep + 1}/{TOUR_STEPS.length})
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-center justify-center mb-6">
            {TOUR_STEPS[currentStep].image}
          </div>
          <h3 className="text-lg font-medium mb-2">
            {TOUR_STEPS[currentStep].title}
          </h3>
          <p className="text-gray-600">
            {TOUR_STEPS[currentStep].description}
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-4 border-t bg-gray-50">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button
            onClick={handleNext}
            className="flex items-center"
          >
            {currentStep === TOUR_STEPS.length - 1 ? 'Get Started' : 'Next'}
            {currentStep < TOUR_STEPS.length - 1 && (
              <ChevronRight className="h-4 w-4 ml-1" />
            )}
          </Button>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center pb-4 space-x-2">
          {TOUR_STEPS.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-2 rounded-full transition-colors ${
                index === currentStep ? 'bg-primary' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}