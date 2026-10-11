/** Optional page-specific images; paths are resolved against the current language's origin. */
export interface ShareImage {
 src: string;
 width: number;
 height: number;
 alt: string;
}

export interface GalleryMetadataImage extends ShareImage {
 caption: string;
}

export interface GalleryMetadataVideo {
 src: string;
 poster: string;
 name: string;
 description: string;
 duration: number;
 uploadDate: string;
}
