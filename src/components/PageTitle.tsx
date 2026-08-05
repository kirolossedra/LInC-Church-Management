import { useEffect } from 'react';
import LincPageHero from './linc/LincPageHero';

interface PageTitleProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export default function PageTitle({ title, subtitle, icon }: PageTitleProps) {
  useEffect(() => {
    document.title = `${title} | LInC One`;
  }, [title]);

  return (
    <div className="mb-8">
      <LincPageHero title={title} description={subtitle} icon={icon} />
    </div>
  );
}
