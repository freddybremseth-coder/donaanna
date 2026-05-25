import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface PublicWebsitePost {
  id: string;
  destination_id: string;
  destination_label: string;
  destination_path: string;
  content_type: string;
  title: string;
  slug: string;
  summary: string;
  markdown: string;
  image_url: string | null;
  tags: string[];
  published_at: string | null;
  created_at: string;
}

const selectColumns = [
  'id',
  'destination_id',
  'destination_label',
  'destination_path',
  'content_type',
  'title',
  'slug',
  'summary',
  'markdown',
  'image_url',
  'tags',
  'published_at',
  'created_at',
].join(',');

export async function fetchPublishedPosts(destinationId: string): Promise<PublicWebsitePost[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('website_posts')
    .select(selectColumns)
    .eq('status', 'published')
    .eq('destination_id', destinationId)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[DonaAnna] Kunne ikke hente publiserte CMS-poster', error);
    return [];
  }

  return (data || []) as unknown as PublicWebsitePost[];
}

export async function fetchPublishedPost(destinationId: string, slug: string): Promise<PublicWebsitePost | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('website_posts')
    .select(selectColumns)
    .eq('status', 'published')
    .eq('destination_id', destinationId)
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.warn('[DonaAnna] Kunne ikke hente CMS-post', error);
    return null;
  }

  return (data || null) as unknown as PublicWebsitePost | null;
}
