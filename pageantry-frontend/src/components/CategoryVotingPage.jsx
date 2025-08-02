import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { candidatesAPI, scoresAPI } from '../lib/api';
import { 
  Crown, 
  Star, 
  CheckCircle, 
  Clock, 
  LogOut,
  ArrowRight,
  ArrowLeft,
  Trophy,
  User,
  Loader2,
  Send,
  AlertCircle
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Input } from './ui/input';
import { Label } from './ui/label';

const CategoryVotingPage = ({ category, onBack }) => {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState('');
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const categories = {
    sports_attire: { name: 'Sports Attire', weight: '20%', icon: Trophy, color: 'bg-blue-600' },
    swimsuit: { name: 'Swimsuit', weight: '20%', icon: Star, color: 'bg-red-600' },
    gown: { name: 'Gown', weight: '30%', icon: Crown, color: 'bg-purple-600' },
    qa: { name: 'Q&A', weight: '30%', icon: User, color: 'bg-green-600' },
  };

  const currentCategory = categories[category];
  const currentCandidate = candidates[currentIndex];

  // Load candidates for current category
  useEffect(() => {
    loadCandidatesForJudging();
  }, [category]);

  const loadCandidatesForJudging = async () => {
    try {
      setLoading(true);
      const response = await candidatesAPI.getForJudging(category);
      const data = response.data.data;
      
      setCandidates(data.candidates || []);
      setProgress(data.progress || {});
      
      // Only set current index if there are candidates
      if (data.candidates && data.candidates.length > 0) {
        // Find first unvoted candidate
        const unvotedIndex = data.candidates.findIndex(c => !c.has_voted);
        if (unvotedIndex !== -1) {
          setCurrentIndex(unvotedIndex);
        } else {
          // All candidates voted, show first one
          setCurrentIndex(0);
        }
      } else {
        setCurrentIndex(0);
        setMessage('No candidates available for voting. Please contact the administrator.');
      }
      
      setScore('');
    } catch (error) {
      console.error('Error loading candidates:', error);
      if (error.response?.status === 404) {
        setMessage('No candidates found. Please contact the administrator to add candidates.');
      } else {
        setMessage('Error loading candidates. Please try again.');
      }
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleScoreSubmit = async () => {
    if (!score || !currentCandidate) return;

    const scoreValue = parseFloat(score);
    if (scoreValue < 0 || scoreValue > 100) {
      setMessage('Score must be between 0 and 100');
      return;
    }

    try {
      setSubmitting(true);
      await scoresAPI.submit({
        candidate_id: currentCandidate.id,
        category: category,
        score: scoreValue,
      });

      // Update candidate as voted
      const updatedCandidates = candidates.map(c => 
        c.id === currentCandidate.id ? { ...c, has_voted: true } : c
      );
      setCandidates(updatedCandidates);

      // Update progress
      setProgress(prev => ({
        ...prev,
        completed: prev.completed + 1,
        remaining: prev.remaining - 1,
        percentage: ((prev.completed + 1) / prev.total) * 100
      }));

      // Move to next unvoted candidate
      const nextUnvotedIndex = updatedCandidates.findIndex((c, index) => 
        index > currentIndex && !c.has_voted
      );

      if (nextUnvotedIndex !== -1) {
        setCurrentIndex(nextUnvotedIndex);
        setScore('');
        setMessage(`Score submitted! Moving to next candidate.`);
      } else {
        setMessage(`Score submitted! All candidates in ${currentCategory.name} category completed.`);
      }

    } catch (error) {
      console.error('Error submitting score:', error);
      setMessage(error.response?.data?.message || 'Error submitting score. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const navigateCandidate = (direction) => {
    const newIndex = direction === 'next' 
      ? Math.min(currentIndex + 1, candidates.length - 1)
      : Math.max(currentIndex - 1, 0);
    
    setCurrentIndex(newIndex);
    setScore('');
    setMessage('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-400" />
          <p className="text-blue-100">Loading voting interface...</p>
        </div>
      </div>
    );
  }

  // Show message if no candidates
  if (!candidates || candidates.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Candidates Available</h3>
            <p className="text-gray-600 mb-4">
              {message || 'No candidates found for this category. Please contact the administrator.'}
            </p>
            <Button onClick={onBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Categories
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className={`w-10 h-10 ${currentCategory.color} rounded-full flex items-center justify-center`}>
                <currentCategory.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{currentCategory.name} Voting</h1>
                <p className="text-sm text-blue-200">Judge: {user?.name}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Progress Card */}
        <Card className="bg-black/20 backdrop-blur-sm border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {currentCategory.name} Progress
              </h3>
              <Badge variant="outline" className="border-white/20 text-white">
                {currentIndex + 1} of {candidates.length}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-blue-200">
                <span>Category Progress</span>
                <span>{progress.completed || 0}/{progress.total || 0} completed</span>
              </div>
              <Progress value={progress.percentage || 0} className="h-3 bg-white/10" />
            </div>
          </CardContent>
        </Card>

        {/* Candidate Voting Card */}
        {currentCandidate && (
          <Card className="bg-black/20 backdrop-blur-sm border-white/10 animate-fade-in-scale">
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                {/* Candidate Photo */}
                <div className="flex justify-center">
                  <div className="relative">
                    <Avatar className="h-40 w-40 border-4 border-white/20">
                      <AvatarImage src={currentCandidate.image_url} />
                      <AvatarFallback className="text-3xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        {currentCandidate.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    {currentCandidate.has_voted && (
                      <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-2">
                        <CheckCircle className="h-6 w-6 text-white" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Candidate Info */}
                <div>
                  <Badge variant="outline" className="mb-3 border-white/20 text-white">
                    Candidate #{currentCandidate.candidate_number}
                  </Badge>
                  <h2 className="text-4xl font-bold mb-2 text-white">{currentCandidate.name}</h2>
                  <p className="text-xl text-blue-200">
                    {currentCategory.name} Category ({currentCategory.weight})
                  </p>
                </div>

                {/* Voting Status */}
                {currentCandidate.has_voted ? (
                  <Alert className="max-w-md mx-auto bg-green-500/20 border-green-500/30">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <AlertDescription className="text-green-100">
                      You have already voted for this candidate in this category.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-6">
                    <div className="max-w-xs mx-auto">
                      <Label htmlFor="score" className="text-lg font-medium text-white">
                        Enter Score (0-100)
                      </Label>
                      <Input
                        id="score"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={score}
                        onChange={(e) => setScore(e.target.value)}
                        placeholder="Enter score..."
                        className="text-center text-2xl h-16 mt-3 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-blue-400"
                      />
                    </div>

                    <Button
                      onClick={handleScoreSubmit}
                      disabled={!score || submitting || currentCandidate.has_voted}
                      className="w-full max-w-xs mx-auto h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-5 w-5" />
                          Submit Score
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Message */}
                {message && (
                  <Alert className="max-w-md mx-auto bg-blue-500/20 border-blue-500/30">
                    <AlertDescription className="text-blue-100">{message}</AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => navigateCandidate('prev')}
            disabled={currentIndex === 0}
            className="touch-target bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="text-center">
            <p className="text-sm text-blue-200">
              Candidate {currentIndex + 1} of {candidates.length}
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => navigateCandidate('next')}
            disabled={currentIndex === candidates.length - 1}
            className="touch-target bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* No Candidates Message */}
        {!loading && candidates.length === 0 && (
          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardContent className="p-8 text-center">
              <Clock className="h-12 w-12 mx-auto mb-4 text-blue-400" />
              <h3 className="text-lg font-semibold mb-2 text-white">No Candidates Available</h3>
              <p className="text-blue-200">
                There are no candidates available for voting in this category.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CategoryVotingPage;

