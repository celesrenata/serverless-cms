import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ContentFilters } from '../components/ContentList/ContentFilters';
import { ContentTable } from '../components/ContentList/ContentTable';
import { ContentActions } from '../components/ContentList/ContentActions';
import { useContentList, useDeleteContent, useBulkUpdateContent } from '../hooks/useContentList';
import { ContentType, ContentStatus } from '../types/content';

export function ContentList() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<{
    type?: ContentType;
    status?: ContentStatus;
    search?: string;
  }>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Fetch content with filters
  const { data, isLoading, error } = useContentList({
    type: filters.type,
    status: filters.status,
    limit: itemsPerPage,
  });

  const deleteContentMutation = useDeleteContent();
  const bulkUpdateMutation = useBulkUpdateContent();

  // Filter content by search term (client-side)
  const filteredContent = useMemo(() => {
    if (!data?.items) return [];
    
    let items = data.items;
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      items = items.filter(
        (item: any) =>
          item.title.toLowerCase().includes(searchLower) ||
          item.slug.toLowerCase().includes(searchLower) ||
          item.excerpt.toLowerCase().includes(searchLower)
      );
    }
    
    return items;
  }, [data?.items, filters.search]);

  // Pagination
  const totalPages = Math.ceil(filteredContent.length / itemsPerPage);
  const paginatedContent = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredContent.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredContent, currentPage, itemsPerPage]);

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedIds(paginatedContent.map((item: any) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectItem = (id: string, selected: boolean) => {
    if (selected) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
    }
  };

  const handleEdit = (id: string) => {
    navigate(`/content/edit/${id}`);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this content?')) {
      try {
        await deleteContentMutation.mutateAsync(id);
        setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
      } catch (error) {
        console.error('Failed to delete content:', error);
        alert('Failed to delete content. Please try again.');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} items?`)) {
      try {
        await Promise.all(selectedIds.map((id) => deleteContentMutation.mutateAsync(id)));
        setSelectedIds([]);
      } catch (error) {
        console.error('Failed to delete content:', error);
        alert('Failed to delete some content. Please try again.');
      }
    }
  };

  const handleBulkPublish = async () => {
    try {
      await bulkUpdateMutation.mutateAsync({
        ids: selectedIds,
        updates: { status: 'published', published_at: Math.floor(Date.now() / 1000) },
      });
      setSelectedIds([]);
    } catch (error) {
      console.error('Failed to publish content:', error);
      alert('Failed to publish some content. Please try again.');
    }
  };

  const handleBulkArchive = async () => {
    try {
      await bulkUpdateMutation.mutateAsync({
        ids: selectedIds,
        updates: { status: 'archived' },
      });
      setSelectedIds([]);
    } catch (error) {
      console.error('Failed to archive content:', error);
      alert('Failed to archive some content. Please try again.');
    }
  };

  const handleBulkDraft = async () => {
    try {
      await bulkUpdateMutation.mutateAsync({
        ids: selectedIds,
        updates: { status: 'draft' },
      });
      setSelectedIds([]);
    } catch (error) {
      console.error('Failed to update content:', error);
      alert('Failed to update some content. Please try again.');
    }
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    setCurrentPage(1);
    setSelectedIds([]);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedIds([]);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Content</h1>
        <button
          onClick={() => navigate('/content/new')}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Create New
        </button>
      </div>

      <ContentFilters filters={filters} onFilterChange={handleFilterChange} />

      <ContentActions
        selectedCount={selectedIds.length}
        onBulkDelete={handleBulkDelete}
        onBulkPublish={handleBulkPublish}
        onBulkArchive={handleBulkArchive}
        onBulkDraft={handleBulkDraft}
      />

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading content...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load content. Please try again.</p>
        </div>
      ) : (
        <>
          <ContentTable
            content={paginatedContent}
            selectedIds={selectedIds}
            onSelectAll={handleSelectAll}
            onSelectItem={handleSelectItem}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />

          {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <nav className="flex gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      currentPage === page
                        ? 'text-white bg-blue-600'
                        : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          )}
        </>
      )}
    </div>
  );
}
