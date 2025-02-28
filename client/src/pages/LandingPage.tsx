import React, { useEffect, useState } from "react";
import { Mic, Brain, ArrowRight, MessageCircle } from "lucide-react";
import Section from "@/components/Section";
import HeroButton from "@/components/HeroButton";
import FeatureCard from "@/components/FeatureCard";

interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
}

const LandingPage = ({navigateToModel}) => {
  const features: Feature[] = [
    {
      icon: Mic,
      title: "Instant Emotional Support",
      description:
        "Get timely, AI-driven responses that help you navigate your thoughts and feelings with ease.",
    },
    {
      icon: Brain,
      title: "Human-like Interaction",
      description: "Experience conversations with remarkable fluidity and understanding that mirrors human interaction.",
    },
    {
      icon: MessageCircle,
      title: "Real-Time Processing",
      description:
        "Speak freely with an AI that understands your emotions and responds with care in real-time.",
    },
  ];

  const [isLoaded, setIsLoaded] = useState(false);
  const [textIndex, setTextIndex] = useState(0);
  const calmoraText = "Calmora AI";

  useEffect(() => {
    // Simulate content loading
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    
    // Text animation
    if (isLoaded && textIndex < calmoraText.length) {
      const typingTimer = setTimeout(() => {
        setTextIndex(prev => prev + 1);
      }, 150);
      
      return () => clearTimeout(typingTimer);
    }
    
    return () => clearTimeout(timer);
  }, [isLoaded, textIndex]);


  return (
    <div className="min-h-screen bg-gradient-to-b from-calmora-sand to-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute rounded-full w-[500px] h-[500px] bg-calmora-sky blur-3xl opacity-30 -top-[150px] -right-[100px]"></div>
          <div className="absolute rounded-full w-[300px] h-[300px] bg-calmora-mint blur-3xl opacity-20 top-[40%] -left-[150px]"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-40 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center justify-center px-3 py-1 mb-6 rounded-full bg-calmora-sage text-calmora-800 text-sm font-medium animate-fade-in space-x-2">
              <span>Introducing</span> 
              <span className="ml-1 relative">
                {calmoraText.substring(0, textIndex)}
                <span className="absolute right-[-2px] h-5 w-[2px] bg-calmora-800 animate-pulse-slow" style={{ opacity: textIndex < calmoraText.length ? 1 : 0 }}></span>
              </span>
              <span className="ml-1 animate-float">✨</span>
            </div>
            <h1 
              className={`text-5xl sm:text-6xl md:text-7xl font-bold text-calmora-900 mb-6 transition-opacity-slow ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            >
              A safe space, powered by AI, designed for you <span className="text-3xl">🧘</span>
            </h1>
            <p 
              className={`text-xl text-calmora-600 mb-10 max-w-2xl mx-auto transition-opacity-slow transition-transform-slow delay-100 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
            >
Experience the next generation of mental wellness with our advanced AI-powered therapy assistant. Compassionate, intuitive, and designed to support you every step of the way.
            </p>
            <div 
              className={`transition-opacity-slow transition-transform-slow delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
            >
              <HeroButton onClick={navigateToModel}>
                Try Calmora AI
              </HeroButton>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <Section 
        title="Intelligent Features" 
        subtitle="Discover how Calmora AI transforms the way you interact with technology."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
          {features.map((feature, index) => (
            <FeatureCard 
              key={index} 
              {...feature} 
              className={`transition-opacity-slow transition-transform-slow delay-${(index + 1) * 100} ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            />
          ))}
        </div>
      </Section>

      {/* Statement Section */}
      <Section className="bg-calmora-sand">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-calmora-900 mb-8">
          Your AI companion for a calmer mind <span className="inline-block animate-float">🌿</span>
          </h2>
          <p className="text-xl text-calmora-700 mb-6">
          At Calmora, we believe in providing compassionate and intelligent support to help you navigate life’s challenges with ease.
          Our AI-powered therapy assistant is designed to offer a safe space, promote emotional well-being, and guide you toward a healthier mind—anytime, anywhere.
          </p>
          <p className="text-xl text-calmora-700 mb-12">
          Join a community of mindful individuals embracing well-being with intelligent support and compassionate design. Experience the perfect blend of empathy and innovation with Calmora.
          </p>
        </div>
      </Section>

      {/* Demonstration Section */}
      <Section>
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl shadow-xl">
          <div className="aspect-video bg-gradient-to-br from-calmora-sky to-calmora-100 flex items-center justify-center">
            <div className="text-center p-8">
              <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-calmora-900 text-white animate-pulse-slow">
                <Mic className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-semibold text-calmora-900 mb-2">Experience Calmora AI</h3>
              <p className="text-calmora-600 mb-8">See how Calmora transforms your journey to mental well-being with intelligent and compassionate support.</p>
              <HeroButton onClick={navigateToModel} variant="secondary">
                Watch Demo
              </HeroButton>
            </div>
          </div>
        </div>
      </Section>

      {/* CTA Section */}
      <Section 
        className="bg-gradient-to-br from-calmora-900 to-calmora-800 text-white" 
        title="Ready to Experience the Future?" 
        subtitle="Join the growing community of users who are already revolutionizing their communication with AI."
        dark={true}
      >
        <div className="text-center">
          <div className="flex flex-col items-center justify-center space-y-8">
            <div className="text-2xl">🌙 🎧 🌊</div>
            <HeroButton 
              onClick={navigateToModel} 
              className="bg-white text-calmora-900 hover:bg-calmora-50"
            >
              Get Started Now
            </HeroButton>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <footer className="bg-white py-12 border-t border-calmora-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-calmora-600 text-sm">
              © {new Date().getFullYear()} Calmora AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;