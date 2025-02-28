import React from "react";

interface SectionProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
  dark?: boolean;
}

const Section: React.FC<SectionProps> = ({
  title,
  subtitle,
  children,
  className = "",
  fullWidth = false,
  dark = false,
}) => (
  <section className={`py-24 ${dark ? "bg-calmora-900 text-white" : "bg-white"} ${className}`}>
    <div className={`${fullWidth ? "w-full" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"}`}>
      {title && (
        <div className="text-center mb-16 max-w-3xl mx-auto px-4">
          <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${dark ? "text-white" : "text-calmora-900"}`}>{title}</h2>
          {subtitle && <p className={`text-lg ${dark ? "text-calmora-300" : "text-calmora-600"}`}>{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  </section>
);

export default Section;