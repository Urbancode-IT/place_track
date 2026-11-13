import { useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';

/** Old / separate questions URL → same single finish form (outcome + questions). */
export default function PublicInterviewQuestions() {
  const [searchParams] = useSearchParams();
  const qs = searchParams.toString();

  useEffect(() => {
    document.title = 'Interview outcome & questions — PlaceTrack';
  }, []);

  return <Navigate to={qs ? `/interview/finish?${qs}` : '/interview/finish'} replace />;
}
