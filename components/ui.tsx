import React from 'react';

// --- Card Component ---
const CardContext = React.createContext<{ as?: React.ElementType }>({});

export const Card = React.forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement> & { as?: React.ElementType }>(
  ({ className, as: Component = 'div', ...props }, ref) => (
    <CardContext.Provider value={{ as: Component }}>
      <Component
        ref={ref}
        className={`bg-gray-800/30 border border-white/10 rounded-xl shadow-lg backdrop-blur-sm transition-all hover:border-white/20 ${className || ''}`}
        {...props}
      />
    </CardContext.Provider>
  )
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={`flex flex-col space-y-1.5 p-5 ${className || ''}`}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLProps<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={`text-lg font-semibold leading-none tracking-tight text-gray-50 ${className || ''}`}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLProps<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={`text-sm text-gray-400/90 ${className || ''}`}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={`p-5 pt-0 ${className || ''}`} {...props} />
  )
);
CardContent.displayName = 'CardContent';

// --- Form Components ---

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { size?: 'default' | 'sm' | 'lg' | 'icon' }
>(({ className, size = 'default', ...props }, ref) => {
  const sizeClasses = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3',
    lg: 'h-11 rounded-md px-8',
    icon: 'h-10 w-10',
  };
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg text-sm font-medium ring-offset-gray-900 transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 active:scale-95
      bg-blue-600 text-white hover:bg-blue-700 shadow-[0_4px_14px_0_rgb(0,118,255,39%)] hover:shadow-[0_6px_20px_0_rgb(0,118,255,23%)]
      ${sizeClasses[size]} ${className || ''}`}
      ref={ref}
      {...props}
    />
  );
});
Button.displayName = 'Button';


export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ className, type, ...props }, ref) => {
      return (
        <input
          type={type}
          className={`flex h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200
            file:border-0 file:bg-transparent file:text-sm file:font-medium
            placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200 ${className || ''}`}
          ref={ref}
          {...props}
        />
      );
    }
  );
Input.displayName = 'Input';


export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
    ({ className, ...props }, ref) => (
      <label
        ref={ref}
        className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 block mb-1.5 text-gray-300 ${className || ''}`}
        {...props}
      />
    )
  );
Label.displayName = 'Label';
  

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
({ className, ...props }, ref) => {
    return (
    <select
        className={`flex h-10 w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200
        placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200
        ${className || ''}`}
        ref={ref}
        {...props}
    />
    );
}
);
Select.displayName = 'Select';

export const Modal = ({
    isOpen,
    onClose,
    children,
    title,
}: {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title: string;
}) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex justify-center items-center animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-gray-900/70 border border-white/10 rounded-lg shadow-2xl w-full max-w-lg m-4 relative backdrop-blur-xl animate-slide-up-fade"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none transition-colors rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-700">&times;</button>
                </div>
                <div className="p-5">
                    {children}
                </div>
            </div>
        </div>
    );
};