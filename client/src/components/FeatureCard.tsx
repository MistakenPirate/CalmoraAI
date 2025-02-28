import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  className?: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ 
  icon: Icon, 
  title, 
  description,
  className 
}) => (
  <Card className={cn(
    "glass-card border border-calmora-200 hover:shadow-lg transition-all duration-300 hover-scale overflow-hidden",
    className
  )}>
    <CardContent className="p-8">
      <div className="mb-6 inline-flex items-center justify-center w-12 h-12 rounded-full bg-calmora-sky text-calmora-900">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-xl font-semibold text-calmora-900 mb-3">{title}</h3>
      <p className="text-calmora-600">{description}</p>
    </CardContent>
  </Card>
);

export default FeatureCard;