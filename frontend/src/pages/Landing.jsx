import { useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useAuthHydrated } from '@/hooks/useAuthHydrated';
import { landingPath } from '@/lib/modulePath';
import { Spinner } from '@/components/ui/Spinner';

function HeroVisual() {
  return (
    <div className="landing-hero-visual" aria-hidden="true">
      <div className="landing-hero-visual__glow" />
      <div className="landing-hero-visual__board">
        <div className="landing-hero-visual__bar">
          <span />
          <span />
          <span />
        </div>
        <div className="landing-hero-visual__cols">
          {[
            { title: 'Today', items: ['Priya · Amazon', 'Arun · Zoho', 'Meera · Freshworks'] },
            { title: 'Tomorrow', items: ['Karthik · Infosys', 'Divya · TCS'] },
            { title: 'Follow-ups', items: ['Resume polish', 'Mock round 2'] },
          ].map((col) => (
            <div key={col.title} className="landing-hero-visual__col">
              <p>{col.title}</p>
              <ul>
                {col.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const hydrated = useAuthHydrated();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    document.title = 'PlaceTrack — Placement Portal';
  }, []);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-canvas">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={landingPath(user?.role)} replace />;
  }

  return (
    <div className="landing">
      <div className="landing__atmosphere" aria-hidden="true" />

      <header className="landing__nav">
        <Link to="/" className="landing__brand-mark" aria-label="PlaceTrack home">
          <img src="/placetrack-icon.png" alt="" className="landing__icon" />
          <span>PlaceTrack</span>
        </Link>
        <Link to="/login" className="landing__nav-cta">
          Sign in
        </Link>
      </header>

      <main>
        <section className="landing__hero">
          <HeroVisual />
          <div className="landing__hero-copy">
            <p className="landing__eyebrow">urbancode</p>
            <h1 className="landing__name">PlaceTrack</h1>
            <p className="landing__tagline">
              Schedule interviews, track students, and keep every placement move visible.
            </p>
            <div className="landing__actions">
              <Link to="/login" className="landing__btn landing__btn--primary">
                Sign in
              </Link>
              <a href="#how" className="landing__btn landing__btn--ghost">
                See how it works
              </a>
            </div>
          </div>
        </section>

        <section id="how" className="landing__how">
          <h2>Built for placement teams</h2>
          <p className="landing__how-lead">
            One portal for trainers and admins to run interviews, job applications, and student progress without the spreadsheet scramble.
          </p>
          <ul className="landing__points">
            <li>
              <strong>Interview board</strong>
              <span>Day-wise schedules, trainer load, and finish follow-ups in one view.</span>
            </li>
            <li>
              <strong>Student pipeline</strong>
              <span>Profiles, self-intros, Q&amp;A banks, and honest reviews linked to each candidate.</span>
            </li>
            <li>
              <strong>Job applications</strong>
              <span>Daily application entry and interview slots tracked alongside the calendar.</span>
            </li>
          </ul>
        </section>
      </main>

      <footer className="landing__footer">
        <img src="/placetrack-icon.png" alt="" className="h-6 w-6 object-contain opacity-80" />
        <span>PlaceTrack by urbancode</span>
      </footer>
    </div>
  );
}
