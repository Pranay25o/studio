import { GraduationCap } from 'lucide-react';
import Link from 'next/link';

interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
}

export function Logo({ className, iconSize = 28, textSize = "text-2xl" }: LogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-2 font-bold text-primary ${className}`}>
      <GraduationCap size={iconSize} className="text-accent" />
      <span className={`${textSize} tracking-tight`}>CampusMarks</span>
    </Link>
  );
}
