import React from 'react';
import { CheckCircle, PartyPopper, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type FeedbackVariant = 'success' | 'celebration' | 'subtle';

interface SuccessFeedbackProps {
  title?: string;
  message?: string;
  variant?: FeedbackVariant;
  className?: string;
}

const variantConfig: Record<FeedbackVariant, { icon: React.FC<{ className?: string }>; iconClass: string; containerClass: string }> = {
  success: {
    icon: CheckCircle,
    iconClass: 'text-green-500',
    containerClass: 'bg-green-50 border-green-200',
  },
  celebration: {
    icon: PartyPopper,
    iconClass: 'text-yellow-500',
    containerClass: 'bg-yellow-50 border-yellow-200',
  },
  subtle: {
    icon: Sparkles,
    iconClass: 'text-blue-500',
    containerClass: 'bg-blue-50 border-blue-200',
  },
};

export const SuccessFeedback: React.FC<SuccessFeedbackProps> = ({
  title = 'Success!',
  message,
  variant = 'success',
  className,
}) => {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center p-4 rounded-lg border animate-in fade-in slide-in-from-top-2 duration-300',
        config.containerClass,
        className
      )}
    >
      <div className={cn('flex-shrink-0 animate-in zoom-in duration-300', config.iconClass)}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="ml-3">
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        {message && <p className="text-sm text-gray-600 mt-1">{message}</p>}
      </div>
    </div>
  );
};

// Inline success checkmark animation for buttons/forms
export const SuccessCheckmark: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('flex items-center justify-center', className)}>
    <div className="relative">
      <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center animate-in zoom-in duration-200">
        <CheckCircle className="h-4 w-4 text-green-600 animate-in fade-in duration-300" />
      </div>
    </div>
  </div>
);

// Animated success badge for status changes
export const SuccessBadge: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <span
    className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      'bg-green-100 text-green-800',
      'animate-in fade-in zoom-in duration-300',
      className
    )}
  >
    <CheckCircle className="h-3 w-3 mr-1" />
    {children}
  </span>
);

// Progress indicator for multi-step processes
interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
  className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  labels,
  className,
}) => {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex justify-between mb-2">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <div
              key={index}
              className={cn(
                'flex flex-col items-center flex-1',
                index < totalSteps - 1 ? 'pr-4' : ''
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300',
                  isCompleted
                    ? 'bg-green-600 text-white'
                    : isCurrent
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                    : 'bg-gray-200 text-gray-600'
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="h-5 w-5 animate-in zoom-in duration-200" />
                ) : (
                  index + 1
                )}
              </div>
              {labels && labels[index] && (
                <span
                  className={cn(
                    'mt-2 text-xs text-center',
                    isCompleted || isCurrent ? 'text-gray-900 font-medium' : 'text-gray-500'
                  )}
                >
                  {labels[index]}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {/* Progress bar */}
      <div className="relative h-1 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-green-600 transition-all duration-500 ease-out"
          style={{ width: `${(currentStep / (totalSteps - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
};
