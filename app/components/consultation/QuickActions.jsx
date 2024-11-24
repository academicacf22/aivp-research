'use client';

import { Stethoscope, MessageSquare, HelpCircle, XCircle } from 'lucide-react';
import { Button } from '../ui/button';

const QUICK_ACTIONS = {
  diagnosis: {
    label: "Discuss Diagnosis",
    icon: Stethoscope,
    prompt: "Now that i have taken a history from you, i am ready to discuss the diagnosis. I want you to ask me what I think the diagnosis is and why. Once I have responded, tell me whether I am correct or incorrect. Give me rationale as to why the likely diagnosis is the likely diagnosis from elements which have been elicited in the history."
  },
  feedback: {
    label: "Get Feedback",
    icon: MessageSquare,
    prompt: "Taking into account the consultation we have had, give me feedback on the questions i have asked, elements from the history i have elicited and elements I could have improved"
  },
  questions: {
    label: "What other questions could I ask?",
    icon: HelpCircle,
    prompt: "Give me a list of questions I could have asked to rule in the likely diagnosis/rule out other diagnoses. give me a reason to ask each question"
  },
  end: {
    label: "End Consultation",
    icon: XCircle
  }
};

export default function QuickActions({ onAction, disabled, visibleActions = [], diagnosisDiscussed }) {
  return (
    <div className="flex flex-col space-y-4">
      {visibleActions.map((key) => {
        const action = QUICK_ACTIONS[key];
        const isPrimary = key === 'diagnosis';
        const isDanger = key === 'end';
        
        return (
          <Button
            key={key}
            onClick={() => onAction(key, action.prompt)}
            variant={isDanger ? 'destructive' : isPrimary ? 'default' : 'outline'}
            size="lg"
            className={`w-full h-auto py-4 px-6 flex items-center justify-start space-x-3 transition-all duration-200 shadow-sm hover:shadow ${
              isPrimary ? 'bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90' : ''
            }`}
            disabled={disabled}
          >
            <action.icon className={`h-5 w-5 ${isPrimary ? 'text-white' : ''}`} />
            <span className={`text-left font-medium ${isPrimary ? 'text-white' : ''}`}>
              {action.label}
            </span>
          </Button>
        );
      })}
    </div>
  );
}