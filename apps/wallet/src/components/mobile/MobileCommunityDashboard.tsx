/**
 * Mobile Community Dashboard
 * Social features for proof sharing and community interaction
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Star,
  TrendingUp,
  Heart,
  Share2,
  Eye,
  Award,
  MessageCircle,
  Plus,
  Search,
  Filter,
  Calendar,
  Globe,
  Lock,
  Unlock,
  CheckCircle,
  AlertCircle,
  ThumbsUp,
  Bookmark,
  Download,
  Upload,
  Zap,
  Shield,
  Crown,
  Target
} from 'lucide-react';
import { 
  CommunityStats, 
  CommunityActivity, 
  CommunityProof,
  ProofTemplate
} from '../../services/community/CommunityProofLibrary';
import { communityProofLibrary } from '../../services/community/CommunityProofLibrary';
import { errorService } from "@/services/errorService";

interface CommunityDashboardProps {
  onCreateProof?: () => void;
  onShareProof?: (proof: CommunityProof) => void;
  onExploreProofs?: () => void;
}

interface UserStats {
  proofsShared: number;
  endorsementsReceived: number;
  endorsementsGiven: number;
  trustLevel: number;
  communityRank: number;
  achievements: Achievement[];
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

const MobileCommunityDashboard: React.FC<CommunityDashboardProps> = ({
  onCreateProof,
  onShareProof,
  onExploreProofs
}) => {
  const [communityStats, setCommunityStats] = useState<CommunityStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats>({
    proofsShared: 3,
    endorsementsReceived: 12,
    endorsementsGiven: 8,
    trustLevel: 0.85,
    communityRank: 156,
    achievements: []
  });
  const [recentActivity, setRecentActivity] = useState<CommunityActivity[]>([]);
  const [popularProofs, setPopularProofs] = useState<CommunityProof[]>([]);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'activity' | 'explore' | 'achievements'>('overview');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCommunityData();
    initializeAchievements();
  }, []);

  const loadCommunityData = async () => {
    try {
      setIsLoading(true);
      
      // Load community stats
      const stats = await communityProofLibrary.getCommunityStats();
      setCommunityStats(stats);
      
      // Set recent activity and popular proofs
      setRecentActivity(stats.recentActivity);
      
      // Get popular proofs (mock data for now)
      const searchResults = await communityProofLibrary.searchProofs({
        sortBy: 'popular',
        sortDirection: 'desc',
        limit: 10,
        offset: 0
      });
      setPopularProofs(searchResults.proofs);
      
    } catch (error) {
      errorService.logError('Failed to load community data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeAchievements = () => {
    const achievements: Achievement[] = [
      {
        id: 'first_proof',
        title: 'First Steps',
        description: 'Shared your first proof with the community',
        icon: '🎯',
        unlockedAt: '2024-01-15T10:00:00Z',
        rarity: 'common'
      },
      {
        id: 'trusted_member',
        title: 'Trusted Member',
        description: 'Achieved 80%+ trust score',
        icon: '🛡️',
        unlockedAt: '2024-01-20T14:30:00Z',
        rarity: 'rare'
      },
      {
        id: 'community_helper',
        title: 'Community Helper',
        description: 'Endorsed 10+ community proofs',
        icon: '❤️',
        unlockedAt: '2024-01-25T16:45:00Z',
        rarity: 'epic'
      }
    ];
    
    setUserStats(prev => ({ ...prev, achievements }));
  };

  const handleEndorseProof = async (proof: CommunityProof) => {
    try {
      await communityProofLibrary.endorseProof(
        proof.id,
        'did:persona:user:current',
        'quality',
        'Great proof!'
      );
      
      // Refresh data
      loadCommunityData();
    } catch (error) {
      errorService.logError('Endorsement failed:', error);
    }
  };

  const getTrustLevelColor = (level: number) => {
    if (level >= 0.9) return 'text-green-500';
    if (level >= 0.7) return 'text-blue-500';
    if (level >= 0.5) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getRarityColor = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'legendary': return 'from-yellow-400 to-orange-500';
      case 'epic': return 'from-purple-400 to-pink-500';
      case 'rare': return 'from-blue-400 to-indigo-500';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getActivityIcon = (type: CommunityActivity['type']) => {
    switch (type) {
      case 'proof_shared': return Upload;
      case 'template_created': return Plus;
      case 'endorsement_given': return Heart;
      case 'verification_completed': return CheckCircle;
      default: return Star;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-blue-600 text-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">Community</h1>
            <p className="text-sm opacity-80">
              {communityStats?.totalProofs || 0} proofs • {communityStats?.activeUsers || 0} members
            </p>
          </div>
          
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onCreateProof}
            className="p-3 bg-white bg-opacity-20 rounded-full backdrop-blur-sm"
          >
            <Plus className="w-6 h-6" />
          </motion.button>
        </div>

        {/* User Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold">{userStats.proofsShared}</div>
            <div className="text-xs opacity-80">Shared</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">{userStats.endorsementsReceived}</div>
            <div className="text-xs opacity-80">Endorsed</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">{(userStats.trustLevel * 100).toFixed(0)}%</div>
            <div className="text-xs opacity-80">Trust</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">#{userStats.communityRank}</div>
            <div className="text-xs opacity-80">Rank</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex space-x-0">
          {[
            { key: 'overview', label: 'Overview', icon: Globe },
            { key: 'activity', label: 'Activity', icon: TrendingUp },
            { key: 'explore', label: 'Explore', icon: Search },
            { key: 'achievements', label: 'Awards', icon: Award }
          ].map(({ key, label, icon: Icon }) => (
            <motion.button
              key={key}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedTab(key as any)}
              className={`flex-1 flex items-center justify-center space-x-1 py-3 text-sm ${
                selectedTab === key
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {selectedTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4 space-y-4"
            >
              {/* Community Stats */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <BarChart3 className="w-5 h-5 text-blue-500 mr-2" />
                  Community Overview
                </h3>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Total Proofs:</span>
                    <span className="ml-2 font-medium">
                      {formatNumber(communityStats?.totalProofs || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Verified:</span>
                    <span className="ml-2 font-medium">
                      {formatNumber(communityStats?.verifiedProofs || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Templates:</span>
                    <span className="ml-2 font-medium">
                      {formatNumber(communityStats?.totalTemplates || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Endorsements:</span>
                    <span className="ml-2 font-medium">
                      {formatNumber(communityStats?.totalEndorsements || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Popular Proofs */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <TrendingUp className="w-5 h-5 text-orange-500 mr-2" />
                    Trending Proofs
                  </h3>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={onExploreProofs}
                    className="text-blue-500 text-sm"
                  >
                    See All
                  </motion.button>
                </div>

                <div className="space-y-3">
                  {popularProofs.slice(0, 3).map((proof) => (
                    <motion.div
                      key={proof.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onShareProof?.(proof)}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 text-sm">
                          {proof.title}
                        </h4>
                        <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Eye className="w-3 h-3" />
                            <span>{proof.usageCount}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Heart className="w-3 h-3" />
                            <span>{proof.endorsements}</span>
                          </div>
                          <div className={`flex items-center space-x-1 ${getTrustLevelColor(proof.trustScore)}`}>
                            <Star className="w-3 h-3" />
                            <span>{(proof.trustScore * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>

                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEndorseProof(proof);
                        }}
                        className="p-2 rounded-lg bg-blue-50 text-blue-500 ml-3"
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-4">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={onCreateProof}
                  className="bg-blue-500 text-white p-4 rounded-xl text-center"
                >
                  <Upload className="w-6 h-6 mx-auto mb-2" />
                  <span className="text-sm font-medium">Share Proof</span>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={onExploreProofs}
                  className="bg-purple-500 text-white p-4 rounded-xl text-center"
                >
                  <Search className="w-6 h-6 mx-auto mb-2" />
                  <span className="text-sm font-medium">Explore</span>
                </motion.button>
              </div>
            </motion.div>
          )}

          {selectedTab === 'activity' && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4 space-y-4"
            >
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Recent Activity</h3>
                
                <div className="space-y-3">
                  {recentActivity.map((activity) => {
                    const ActivityIcon = getActivityIcon(activity.type);
                    return (
                      <div key={activity.id} className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-500">
                          <ActivityIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">
                            <span className="font-medium">
                              {activity.isAnonymous ? 'Anonymous' : activity.actorDisplayName}
                            </span>
                            {' '}
                            {activity.type === 'proof_shared' && 'shared a proof'}
                            {activity.type === 'template_created' && 'created a template'}
                            {activity.type === 'endorsement_given' && 'endorsed a proof'}
                            {activity.type === 'verification_completed' && 'completed verification'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {selectedTab === 'explore' && (
            <motion.div
              key="explore"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4 space-y-4"
            >
              {/* Categories */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Browse by Category</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { category: 'identity', icon: Shield, count: 45, color: 'blue' },
                    { category: 'professional', icon: Users, count: 32, color: 'purple' },
                    { category: 'financial', icon: Zap, count: 28, color: 'green' },
                    { category: 'educational', icon: Star, count: 19, color: 'orange' }
                  ].map(({ category, icon: Icon, count, color }) => (
                    <motion.button
                      key={category}
                      whileTap={{ scale: 0.95 }}
                      onClick={onExploreProofs}
                      className={`p-3 rounded-lg bg-${color}-50 text-${color}-600 text-center`}
                    >
                      <Icon className="w-6 h-6 mx-auto mb-2" />
                      <div className="text-sm font-medium capitalize">{category}</div>
                      <div className="text-xs opacity-80">{count} proofs</div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Templates */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Popular Templates</h3>
                
                <div className="space-y-3">
                  {communityStats?.popularTemplates.slice(0, 3).map((template) => (
                    <motion.div
                      key={template.id}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">
                          {template.name}
                        </h4>
                        <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
                          <span className="capitalize">{template.complexity}</span>
                          <span>•</span>
                          <span>{template.usageCount} uses</span>
                          {template.isOfficial && (
                            <>
                              <span>•</span>
                              <CheckCircle className="w-3 h-3 text-green-500" />
                            </>
                          )}
                        </div>
                      </div>
                      
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        className="p-2 rounded-lg bg-blue-50 text-blue-500"
                      >
                        <Download className="w-4 h-4" />
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {selectedTab === 'achievements' && (
            <motion.div
              key="achievements"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4 space-y-4"
            >
              {/* Trust Level */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Trust Level</h3>
                  <span className={`text-lg font-bold ${getTrustLevelColor(userStats.trustLevel)}`}>
                    {(userStats.trustLevel * 100).toFixed(0)}%
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${userStats.trustLevel * 100}%` }}
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full"
                  />
                </div>
                
                <p className="text-sm text-gray-500">
                  Based on community endorsements and proof quality
                </p>
              </div>

              {/* Achievements */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Achievements</h3>
                
                <div className="space-y-3">
                  {userStats.achievements.map((achievement) => (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center space-x-3 p-3 rounded-lg bg-gradient-to-r"
                      style={{
                        backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))`
                      }}
                    >
                      <div className={`text-2xl p-2 rounded-lg bg-gradient-to-r ${getRarityColor(achievement.rarity)}`}>
                        {achievement.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{achievement.title}</h4>
                        <p className="text-sm text-gray-600">{achievement.description}</p>
                        <p className="text-xs text-gray-500">
                          Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                        achievement.rarity === 'legendary' ? 'bg-yellow-100 text-yellow-800' :
                        achievement.rarity === 'epic' ? 'bg-purple-100 text-purple-800' :
                        achievement.rarity === 'rare' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {achievement.rarity}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Community Rank */}
              <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <Crown className="w-5 h-5 text-orange-500 mr-2" />
                    Community Rank
                  </h3>
                  <span className="text-lg font-bold text-orange-600">
                    #{userStats.communityRank}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">
                  You're in the top {Math.round((userStats.communityRank / (communityStats?.activeUsers || 1000)) * 100)}% of community members
                </p>
                
                <div className="flex items-center space-x-2 text-sm">
                  <Target className="w-4 h-4 text-orange-500" />
                  <span className="text-gray-600">
                    Share 2 more proofs to reach top 100
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MobileCommunityDashboard;