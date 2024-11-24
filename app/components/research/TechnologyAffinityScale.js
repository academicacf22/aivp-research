import React, { useState, useEffect, useCallback } from 'react';

// ATI Scale citation
const SCALE_CITATION = "Franke, T., Attig, C., & Wessel, D. (2019). A Personal Resource for Technology Interaction: Development and Validation of the Affinity for Technology Interaction (ATI) Scale. International Journal of Human–Computer Interaction, 35(6), 456-467.";

const ATI_QUESTIONS = [
  {
    id: 1,
    text: "I like to occupy myself with technical systems.",
    reverse: false
  },
  {
    id: 2,
    text: "I try to understand how a technical system exactly works.",
    reverse: false
  },
  {
    id: 3,
    text: "I mainly deal with technical systems because I have to.",
    reverse: true
  },
  {
    id: 4,
    text: "When I have a new technical system in front of me, I try it out intensively.",
    reverse: false
  },
  {
    id: 5,
    text: "I enjoy spending time becoming acquainted with a technical system.",
    reverse: false
  },
  {
    id: 6,
    text: "It is enough for me that a technical system works; I don't care how or why.",
    reverse: true
  },
  {
    id: 7,
    text: "I try to make full use of the capabilities of a technical system.",
    reverse: false
  },
  {
    id: 8,
    text: "I avoid working with technical systems.",
    reverse: true
  },
  {
    id: 9,
    text: "When I have a new technical system in front of me, I am afraid of breaking something.",
    reverse: false
  }
];

const TechnologyAffinityScale = ({ onComplete }) => {
  const [responses, setResponses] = useState({});
  const [lastSubmittedScore, setLastSubmittedScore] = useState(null);

  const calculateATIScore = useCallback((responses) => {
    let sum = 0;
    
    ATI_QUESTIONS.forEach(question => {
      const value = responses[question.id];
      sum += question.reverse ? (7 - value) : value;
    });

    return (sum / ATI_QUESTIONS.length).toFixed(2);
  }, []);

  useEffect(() => {
    // Only calculate and update if we have all responses
    if (Object.keys(responses).length === ATI_QUESTIONS.length) {
      const score = calculateATIScore(responses);
      if (score !== lastSubmittedScore) {
        setLastSubmittedScore(score);
        onComplete(score);
      }
    }
  }, [responses, calculateATIScore, lastSubmittedScore, onComplete]);

  const handleResponse = (questionId, value) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-primary">Technology Affinity Scale</h2>
        <p className="text-gray-600 mt-1">
          In the following questionnaire, we will ask you about your interaction with technical systems. The term 'technical systems' refers to apps and other software applications, as well as entire digital devices (e.g. mobile phone, computer, TV, car navigation). Please indicate your level of agreement with each statement.
        </p>
      </div>

      <div className="space-y-6">
        {ATI_QUESTIONS.map((question) => (
          <div key={question.id} className="space-y-2">
            <p className="text-sm font-medium">{question.text}</p>
            <div className="flex justify-between items-center gap-4">
              <div className="text-xs text-gray-500">Completely disagree</div>
              {[1, 2, 3, 4, 5, 6].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleResponse(question.id, value)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                    responses[question.id] === value
                      ? 'bg-primary text-white'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  {value}
                </button>
              ))}
              <div className="text-xs text-gray-500">Completely agree</div>
            </div>
          </div>
        ))}

        <div className="mt-8 text-xs text-gray-500 italic">
          <p>Scale source: {SCALE_CITATION}</p>
        </div>

        {Object.keys(responses).length === ATI_QUESTIONS.length && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-lg mb-2">Questionnaire Complete</h3>
            <p className="text-sm text-gray-600">
              Thank you for completing the technology interaction assessment. You can now proceed to the next step.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TechnologyAffinityScale;