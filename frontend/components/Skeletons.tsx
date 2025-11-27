import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

// Entity Card Skeleton for Case Detail Page
export function EntityCardSkeleton() {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton circle width={32} height={32} baseColor="#374151" highlightColor="#4b5563" />
        <div className="flex-1">
          <Skeleton width="60%" height={16} baseColor="#374151" highlightColor="#4b5563" />
          <Skeleton width="40%" height={12} baseColor="#374151" highlightColor="#4b5563" className="mt-1" />
        </div>
      </div>
      <Skeleton height={60} baseColor="#374151" highlightColor="#4b5563" className="mb-2" />
      <Skeleton height={20} baseColor="#374151" highlightColor="#4b5563" />
    </div>
  );
}

// Case Card Skeleton for Cases List Page
export function CaseCardSkeleton() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <div className="flex items-start justify-between mb-4">
        <Skeleton width="70%" height={24} baseColor="#1f2937" highlightColor="#374151" />
        <Skeleton width={60} height={24} baseColor="#1f2937" highlightColor="#374151" />
      </div>
      <Skeleton count={2} height={14} baseColor="#1f2937" highlightColor="#374151" className="mb-4" />
      <div className="flex items-center gap-4 mb-4">
        <Skeleton width={100} height={14} baseColor="#1f2937" highlightColor="#374151" />
        <Skeleton width={80} height={14} baseColor="#1f2937" highlightColor="#374151" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton width={80} height={20} baseColor="#1f2937" highlightColor="#374151" />
        <Skeleton width={100} height={14} baseColor="#1f2937" highlightColor="#374151" />
      </div>
    </div>
  );
}

// Graph Node Detail Skeleton
export function NodeDetailSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Skeleton circle width={48} height={48} baseColor="#1f2937" highlightColor="#374151" />
            <div className="flex-1">
              <Skeleton width="60%" height={24} baseColor="#1f2937" highlightColor="#374151" />
              <Skeleton width="40%" height={16} baseColor="#1f2937" highlightColor="#374151" className="mt-1" />
            </div>
          </div>
          <Skeleton height={8} baseColor="#1f2937" highlightColor="#374151" className="mt-3" />
        </div>
      </div>

      {/* Data Sections */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-gray-800 rounded-lg p-4">
          <Skeleton width="40%" height={16} baseColor="#374151" highlightColor="#4b5563" className="mb-3" />
          <div className="space-y-2">
            <Skeleton height={14} baseColor="#374151" highlightColor="#4b5563" />
            <Skeleton height={14} baseColor="#374151" highlightColor="#4b5563" />
            <Skeleton height={14} width="80%" baseColor="#374151" highlightColor="#4b5563" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Statistics Dashboard Skeleton
export function StatsSkeleton() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <Skeleton width={200} height={24} baseColor="#1f2937" highlightColor="#374151" className="mb-4" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-4">
            <Skeleton width="60%" height={16} baseColor="#374151" highlightColor="#4b5563" className="mb-3" />
            <div className="space-y-2">
              <Skeleton height={20} baseColor="#374151" highlightColor="#4b5563" />
              <Skeleton height={20} baseColor="#374151" highlightColor="#4b5563" />
              <Skeleton height={20} baseColor="#374151" highlightColor="#4b5563" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
