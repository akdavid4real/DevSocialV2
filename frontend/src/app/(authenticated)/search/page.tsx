"use client"

import { useState, useEffect, useCallback } from 'react'
import { Search, X, Hash, User, FileText, TrendingUp, Sparkles, Loader2 } from 'lucide-react'
import { useRouter, useSearchParams } from '@/lib/navigation'
import PostCard from '@/components/home/PostCard'
import { useAuth } from '@/contexts/auth-context'
import api from '@/lib/api'
import Image from '@/components/ui/image'
import Link from '@/components/ui/link'

interface SearchResults {
    posts: any[]
    users: any[]
    tags: any[]
}

export default function SearchPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { user: currentUser } = useAuth()
    
    const [searchQuery, setSearchQuery] = useState(searchParams?.get('q') || '')
    const [activeTab, setActiveTab] = useState('all')
    const [searchResults, setSearchResults] = useState<SearchResults>({ posts: [], users: [], tags: [] })
    const [isSearching, setIsSearching] = useState(false)
    const [hasSearched, setHasSearched] = useState(false)
    const [searchError, setSearchError] = useState(false)

    const performSearch = useCallback(async (query: string) => {
        if (!query.trim()) {
            setSearchResults({ posts: [], users: [], tags: [] })
            setHasSearched(false)
            return
        }

        setIsSearching(true)
        setSearchError(false)
        try {
            const response: any = await api.get(`/search?q=${encodeURIComponent(query)}&type=all`)
            const results = response.data?.data?.results || response.data?.results || response.results
            if (!results || !['posts', 'users', 'tags'].every(key => Array.isArray(results[key]))) {
                throw new Error('Invalid search response')
            }
            setSearchResults({
                posts: results.posts || [],
                users: results.users || [],
                tags: results.tags || [],
            })
            setHasSearched(true)
        } catch (error) {
            console.error('[SEARCH] Error:', error)
            setSearchResults({ posts: [], users: [], tags: [] })
            setHasSearched(false)
            setSearchError(true)
        } finally {
            setIsSearching(false)
        }
    }, [])

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchQuery.trim()) {
                performSearch(searchQuery)
            } else {
                setSearchResults({ posts: [], users: [], tags: [] })
                setHasSearched(false)
            }
        }, 500)

        return () => clearTimeout(timeoutId)
    }, [searchQuery, performSearch])

    const totalResults = searchResults.posts.length + searchResults.users.length + searchResults.tags.length

    const trendingSearches = ['Next.js', 'TypeScript', 'React', 'AI/ML', 'Web3', 'DevOps']
    const categories = [
        { icon: '💻', title: 'Frontend', desc: 'React, Vue, Angular', query: 'frontend' },
        { icon: '⚙️', title: 'Backend', desc: 'Node.js, Python, Go', query: 'backend' },
        { icon: '📱', title: 'Mobile', desc: 'React Native, Flutter', query: 'mobile' },
        { icon: '🎨', title: 'Design', desc: 'UI/UX, Figma, CSS', query: 'design' },
        { icon: '🤖', title: 'AI & ML', desc: 'Machine Learning, AI', query: 'AI' },
        { icon: '🔐', title: 'Security', desc: 'Cybersecurity, Auth', query: 'security' },
    ]

    return (
        <div className="max-w-[1200px] mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
                <div className="flex items-center justify-center">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                        <Search className="h-8 w-8 text-foreground" />
                    </div>
                </div>
                <div>
                    <h1 className="text-4xl font-bold uppercase tracking-tighter text-foreground mb-2">Search Hub</h1>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                        Discover posts, users, and topics
                    </p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="p-6 rounded-[32px] bg-white/[0.02] border border-white/5">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60" />
                    <input
                        type="text"
                        placeholder="Search for posts, users, or topics..."
                        aria-label="Search posts, users, or topics"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-14 pl-12 pr-12 rounded-[20px] bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-[border-color,box-shadow]"
                    />
                    {searchQuery && (
                        <button
                            aria-label="Clear search"
                            onClick={() => { setSearchQuery(''); setSearchError(false) }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-[background-color]"
                        >
                            <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                    )}
                </div>

                {searchQuery && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
                            {isSearching ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Searching...
                                </div>
                            ) : hasSearched ? (
                                `${totalResults} Results Found`
                            ) : null}
                        </div>
                    </div>
                )}
            </div>

            {searchError && !isSearching && searchQuery && (
                <p role="alert" className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">
                    Search couldn't load. Please try again.
                </p>
            )}

            {/* Search Results */}
            {hasSearched && !isSearching && (
                <div className="space-y-8">
                    {/* Tabs */}
                    <nav className="flex items-center gap-6 border-b border-white/5 pb-4">
                        {[
                            { id: 'all', label: 'All', count: totalResults },
                            { id: 'posts', label: 'Posts', count: searchResults.posts.length },
                            { id: 'users', label: 'Users', count: searchResults.users.length },
                            { id: 'tags', label: 'Tags', count: searchResults.tags.length },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative py-2 text-sm font-semibold tracking-widest uppercase transition-colors flex items-center gap-2 ${
                                    activeTab === tab.id ? 'text-primary' : 'text-muted-foreground/60 hover:text-foreground'
                                }`}
                            >
                                {tab.label}
                                {tab.count > 0 && (
                                    <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-semibold">
                                        {tab.count}
                                    </span>
                                )}
                                {activeTab === tab.id && (
                                    <div className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-primary rounded-full" />
                                )}
                            </button>
                        ))}
                    </nav>

                    {/* Posts Results */}
                    {(activeTab === 'all' || activeTab === 'posts') && searchResults.posts.length > 0 && (
                        <section className="space-y-6">
                            <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/60 ml-1 flex items-center gap-2">
                                <FileText className="h-3.5 w-3.5" />
                                Posts
                            </h3>
                            <div className="space-y-6">
                                {searchResults.posts.slice(0, activeTab === 'all' ? 3 : undefined).map((post) => (
                                    <PostCard key={post.id} post={post} currentUserId={currentUser?.id} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Users Results */}
                    {(activeTab === 'all' || activeTab === 'users') && searchResults.users.length > 0 && (
                        <section className="space-y-6">
                            <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/60 ml-1 flex items-center gap-2">
                                <User className="h-3.5 w-3.5" />
                                Users
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {searchResults.users.slice(0, activeTab === 'all' ? 4 : undefined).map((user: any) => (
                                    <Link
                                        key={user.id}
                                        href={`/@${user.username}`}
                                        className="p-6 rounded-[24px] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <Image
                                                src={user.avatar || '/default-avatar.png'}
                                                alt={user.displayName || user.username}
                                                width={48}
                                                height={48}
                                                className="rounded-full border-2 border-white/10 group-hover:border-primary/50 transition-colors"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                                    {user.displayName || user.username}
                                                </p>
                                                <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
                                                    @{user.username}
                                                </p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-semibold uppercase">
                                                        LVL {user.level}
                                                    </span>
                                                    <span className="text-xs font-semibold text-muted-foreground/60 uppercase">
                                                        {user.points} XP
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Tags Results */}
                    {(activeTab === 'all' || activeTab === 'tags') && searchResults.tags.length > 0 && (
                        <section className="space-y-6">
                            <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/60 ml-1 flex items-center gap-2">
                                <Hash className="h-3.5 w-3.5" />
                                Tags
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {searchResults.tags.slice(0, activeTab === 'all' ? 4 : undefined).map((tag: any) => {
                                    const tagName = tag.slug || tag.tag || tag.name
                                    return (
                                        <Link
                                            key={tag.id || tagName}
                                            href={`/tag/${encodeURIComponent(tagName)}`}
                                            className="p-5 rounded-[24px] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-primary/50 transition-all group"
                                        >
                                            <div className="flex items-start gap-4">
                                                <div
                                                    className="h-11 w-11 rounded-full border border-white/10 flex items-center justify-center shrink-0"
                                                    style={{ backgroundColor: `${tag.color || '#3b82f6'}22`, color: tag.color || '#3b82f6' }}
                                                >
                                                    <Hash className="h-5 w-5" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                                        #{tag.tag || tag.name}
                                                    </p>
                                                    {tag.description && (
                                                        <p className="mt-1 text-xs text-muted-foreground/70 line-clamp-2">
                                                            {tag.description}
                                                        </p>
                                                    )}
                                                    <p className="mt-2 text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
                                                        {tag.posts || tag.count || 0} posts
                                                    </p>
                                                </div>
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        </section>
                    )}

                    {/* No Results */}
                    {totalResults === 0 && (
                        <div className="p-12 rounded-[40px] bg-white/[0.02] border border-white/5 border-dashed flex flex-col items-center justify-center text-center">
                            <Search className="h-16 w-16 text-muted-foreground/20 mb-4" />
                            <h3 className="text-sm font-semibold text-foreground uppercase tracking-widest mb-2">No Results Found</h3>
                            <p className="text-xs text-muted-foreground/60 uppercase tracking-[0.2em]">
                                Try different keywords or browse trending topics
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Default State - Trending & Categories */}
            {!hasSearched && !searchQuery && (
                <div className="space-y-8">
                    {/* Trending Searches */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                                <TrendingUp className="h-5 w-5 text-foreground" />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Trending Searches</h2>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                                    Popular right now
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {trendingSearches.map((term, i) => (
                                <button
                                    key={term}
                                    onClick={() => setSearchQuery(term)}
                                    className="flex items-center gap-3 p-4 rounded-[20px] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-primary/50 transition-all group"
                                >
                                    <span className="text-2xl font-semibold text-primary/30 group-hover:text-primary transition-colors">
                                        #{i + 1}
                                    </span>
                                    <span className="text-sm font-semibold text-foreground uppercase tracking-wider">{term}</span>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Categories */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                <Hash className="h-5 w-5 text-foreground" />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground">Explore Categories</h2>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                                    Browse by topic
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {categories.map((cat) => (
                                <button
                                    key={cat.title}
                                    onClick={() => setSearchQuery(cat.query)}
                                    className="flex items-start gap-4 p-6 rounded-[24px] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-primary/50 transition-all text-left group"
                                >
                                    <span className="text-4xl">{cat.icon}</span>
                                    <div>
                                        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider group-hover:text-primary transition-colors">
                                            {cat.title}
                                        </h4>
                                        <p className="text-xs text-muted-foreground/60 mt-1">{cat.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>
                </div>
            )}
        </div>
    )
}
