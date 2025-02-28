import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeroButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary";
  withIcon?: boolean;
}

const HeroButton: React.FC<HeroButtonProps> = ({
  onClick,
  children,
  className,
  variant = "primary",
  withIcon = true,
}) => {
  const baseStyles = "rounded-full font-medium transition-all duration-300 py-6 px-8 text-base";
  
  const variantStyles = {
    primary: "bg-calmora-900 text-white hover:bg-calmora-800 shadow-sm hover:shadow-md",
    secondary: "bg-white text-calmora-900 border border-calmora-200 hover:bg-calmora-50 shadow-sm hover:shadow-md"
  };

  return (
    <Button
      onClick={onClick}
      className={cn(
        baseStyles,
        variantStyles[variant],
        "hover:scale-[1.02] active:scale-[0.98]",
        className
      )}
    >
      <span>{children}</span>
      {withIcon && <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />}
    </Button>
  );
};

export default HeroButton;