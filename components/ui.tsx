import React from 'react';
import ReactDOM from 'react-dom';

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

// --- Dialog Components (Modern Pop-up) ---
const DialogContext = React.createContext<{
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}>({
  open: false,
  setOpen: () => {},
});

export const Dialog = ({ children, open, onOpenChange }: { children: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void; }) => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  
  const dialogOpen = open !== undefined ? open : internalOpen;
  const setDialogOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen;

  return (
    <DialogContext.Provider value={{ open: dialogOpen, setOpen: setDialogOpen }}>
      {children}
    </DialogContext.Provider>
  );
};

export const DialogTrigger = ({ children }: { children: React.ReactNode }) => {
  const { setOpen } = React.useContext(DialogContext);
  return React.cloneElement(children as React.ReactElement, {
    onClick: () => setOpen(true),
  });
};

export const DialogClose = ({ children }: { children: React.ReactNode }) => {
    const { setOpen } = React.useContext(DialogContext);
    return React.cloneElement(children as React.ReactElement, {
      onClick: () => setOpen(false),
    });
};

const DialogPortal = ({ children }: { children: React.ReactNode }) => {
    const { open } = React.useContext(DialogContext);
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!mounted || !open) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-50">{children}</div>,
        document.body
    );
};


export const DialogOverlay = React.forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={`fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ${className || ''}`}
        {...props}
    />
));
DialogOverlay.displayName = 'DialogOverlay';

export const DialogContent = React.forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement> & {onClose?: () => void}>(({ className, children, onClose, ...props }, ref) => {
    const { open, setOpen } = React.useContext(DialogContext);

    const handleClose = () => {
        if(onClose) onClose();
        setOpen(false);
    }

    return (
        <DialogPortal>
            <DialogOverlay onClick={handleClose} data-state={open ? 'open' : 'closed'} />
            <div
                ref={ref}
                data-state={open ? 'open' : 'closed'}
                className={`fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-white/10 bg-gray-900/80 p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg backdrop-blur-xl ${className || ''}`}
                onClick={(e) => e.stopPropagation()}
                {...props}
            >
                {children}
                <button onClick={handleClose} className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    <span className="sr-only">Close</span>
                </button>
            </div>
        </DialogPortal>
    );
});
DialogContent.displayName = 'DialogContent';


export const DialogHeader = ({ className, ...props }: React.HTMLProps<HTMLDivElement>) => (
    <div
        className={`flex flex-col space-y-1.5 text-center sm:text-left ${className || ''}`}
        {...props}
    />
);
DialogHeader.displayName = 'DialogHeader';

export const DialogFooter = ({ className, ...props }: React.HTMLProps<HTMLDivElement>) => (
    <div
        className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className || ''}`}
        {...props}
    />
);
DialogFooter.displayName = 'DialogFooter';

export const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLProps<HTMLHeadingElement>>(({ className, ...props }, ref) => (
    <h2
        ref={ref}
        className={`text-lg font-semibold leading-none tracking-tight text-gray-50 ${className || ''}`}
        {...props}
    />
));
DialogTitle.displayName = 'DialogTitle';

export const DialogDescription = React.forwardRef<HTMLParagraphElement, React.HTMLProps<HTMLParagraphElement>>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={`text-sm text-gray-400/90 ${className || ''}`}
        {...props}
    />
));
DialogDescription.displayName = 'DialogDescription';