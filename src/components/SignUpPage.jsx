import { useState } from 'react';

export default function SignUpPage({ onSignUp, onBackToSignIn }) {
  const [role, setRole] = useState('student');
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [program, setProgram] = useState('');
  const [semester, setSemester] = useState('1');
  const [section, setSection] = useState('A');
  const [weeklyHours, setWeeklyHours] = useState('20');
  const [expertise, setExpertise] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignUp = async () => {
    setError('');
    
    if (!studentId.trim()) {
      setError(`Please enter a ${role === 'student' ? 'Student' : 'Teacher'} ID`);
      return;
    }
    
    const prefix = role === 'student' ? 'S-' : 'T-';
    if (!studentId.startsWith(prefix)) {
      setError(`${role === 'student' ? 'Student' : 'Teacher'} ID must start with ${prefix}`);
      return;
    }
    
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (!password.trim()) {
      setError('Please enter a password');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (role === 'student') {
      if (!program.trim()) {
        setError('Please enter your program/major');
        return;
      }
    } else if (role === 'teacher') {
      if (!weeklyHours || Number(weeklyHours) <= 0) {
        setError('Please enter valid weekly hours');
        return;
      }
    }

    setIsLoading(true);
    try {
      const signupData = {
        id: studentId,
        name,
        email,
        password,
        role,
      };

      if (role === 'student') {
        Object.assign(signupData, {
          program,
          semester: Number(semester),
          section,
          minorCourses: [],
          skillBasedCourses: [],
          abilityEnhancementCourses: [],
          valueAddedCourses: [],
        });
      } else if (role === 'teacher') {
        Object.assign(signupData, {
          weeklyRequiredHours: Number(weeklyHours),
          hoursLeft: Number(weeklyHours),
          skipsUsed: 0,
          expertise: expertise.trim(),
          preferences: [],
        });
      }

      await onSignUp(signupData);
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center bg-black">
      <div
        className="fixed inset-0 w-full min-h-full"
        style={{
          backgroundImage: `url('https://api.builder.io/api/v1/image/assets/TEMP/6ab6bf916fd76de603b3d52ed2ddeaa438c774f1?width=2048')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#000',
          backgroundAttachment: 'fixed'
        }}
      />

      <button 
        onClick={onBackToSignIn}
        className="absolute top-12 left-12 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
      >
        <img 
          src="https://api.builder.io/api/v1/image/assets/TEMP/4eb70e7c099aa62f60aec47a4cbd7d60c2a9432a?width=60" 
          alt="Back"
          className="w-4 h-4"
        />
      </button>

      <div className="relative z-10 w-full max-w-md mx-4 p-8 rounded-3xl bg-white/5 backdrop-blur-lg border border-white/10 shadow-2xl text-left max-h-[90vh] overflow-y-auto">
        <div className="space-y-6">
          <div className="space-y-2 text-left">
            <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
              Create Account
            </h1>
            <h2 className="text-2xl font-normal text-white/90">
              Sign Up
            </h2>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setRole('student')}
              className={`flex-1 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                role === 'student'
                  ? 'bg-white/30 text-white border border-white/50'
                  : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/15'
              }`}
              disabled={isLoading}
            >
              Student
            </button>
            <button
              onClick={() => setRole('teacher')}
              className={`flex-1 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                role === 'teacher'
                  ? 'bg-white/30 text-white border border-white/50'
                  : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/15'
              }`}
              disabled={isLoading}
            >
              Teacher
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="relative">
              <label className="block text-xs font-light text-white/60 mb-2">
                {role === 'student' ? 'Student' : 'Teacher'} ID
              </label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full h-12 px-4 rounded-3xl bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent transition-all"
                placeholder={role === 'student' ? 'e.g., S-1001' : 'e.g., T-101'}
                disabled={isLoading}
              />
            </div>

            <div className="relative">
              <label className="block text-xs font-light text-white/60 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-12 px-4 rounded-3xl bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent transition-all"
                placeholder="Enter your full name"
                disabled={isLoading}
              />
            </div>

            <div className="relative">
              <label className="block text-xs font-light text-white/60 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 px-4 rounded-3xl bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent transition-all"
                placeholder="Enter your email"
                disabled={isLoading}
              />
            </div>

            {role === 'student' && (
              <>
                <div className="relative">
                  <label className="block text-xs font-light text-white/60 mb-2">
                    Program / Major
                  </label>
                  <input
                    type="text"
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                    className="w-full h-12 px-4 rounded-3xl bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent transition-all"
                    placeholder="e.g., BSc Computer Science"
                    disabled={isLoading}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <label className="block text-xs font-light text-white/60 mb-2">
                      Semester
                    </label>
                    <select
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      className="w-full h-12 px-4 rounded-3xl bg-white/20 backdrop-blur-sm border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent transition-all"
                      disabled={isLoading}
                    >
                      {Array.from({ length: 8 }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </div>
                  <div className="relative">
                    <label className="block text-xs font-light text-white/60 mb-2">
                      Section
                    </label>
                    <select
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                      className="w-full h-12 px-4 rounded-3xl bg-white/20 backdrop-blur-sm border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent transition-all"
                      disabled={isLoading}
                    >
                      {['A', 'B', 'C', 'D', 'E'].map(sec => (
                        <option key={sec} value={sec}>{sec}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            {role === 'teacher' && (
              <>
                <div className="relative">
                  <label className="block text-xs font-light text-white/60 mb-2">
                    Weekly Required Hours
                  </label>
                  <input
                    type="number"
                    value={weeklyHours}
                    onChange={(e) => setWeeklyHours(e.target.value)}
                    className="w-full h-12 px-4 rounded-3xl bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent transition-all"
                    placeholder="e.g., 20"
                    min="1"
                    disabled={isLoading}
                  />
                </div>

                <div className="relative">
                  <label className="block text-xs font-light text-white/60 mb-2">
                    Expertise / Specialization (Optional)
                  </label>
                  <input
                    type="text"
                    value={expertise}
                    onChange={(e) => setExpertise(e.target.value)}
                    className="w-full h-12 px-4 rounded-3xl bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent transition-all"
                    placeholder="e.g., Mathematics, Physics"
                    disabled={isLoading}
                  />
                </div>
              </>
            )}

            <div className="relative">
              <label className="block text-xs font-light text-white/60 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 px-4 rounded-3xl bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent transition-all"
                placeholder="Enter password (min 6 characters)"
                disabled={isLoading}
              />
            </div>

            <div className="relative">
              <label className="block text-xs font-light text-white/60 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-12 px-4 rounded-3xl bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent transition-all"
                placeholder="Confirm password"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={handleSignUp}
              disabled={isLoading}
              className="relative w-full h-12 rounded-3xl bg-white/20 backdrop-blur-sm border border-white/30 text-black font-medium text-sm hover:bg-white/30 transition-all duration-200 flex items-center justify-center group overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-white/50 backdrop-blur-md rounded-3xl group-hover:bg-white/60 transition-all duration-200" />
              <span className="relative z-10 text-black/80 font-normal">
                {isLoading ? 'Creating Account...' : 'Sign Up'}
              </span>
            </button>
          </div>

          <div className="text-center">
            <button 
              onClick={onBackToSignIn}
              className="text-white/70 hover:text-white transition-colors font-normal text-xs"
            >
              Already have an account? Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
