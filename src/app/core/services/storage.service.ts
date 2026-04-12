import { Injectable } from '@angular/core';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { SUPABASE_BUCKETS } from '../../shared/constants';

@Injectable({
    providedIn: 'root',
})
export class StorageService {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = createClient(
            environment.supabase.url,
            environment.supabase.key
        );
    }

    private normalizeFileName(name: string): string {
        return name
            .toLowerCase()
            .normalize('NFD')                          // decompose accents
            .replace(/[\u0300-\u036f]/g, '')           // strip accent marks
            .replace(/[^a-z0-9.\-_]/g, '_')            // replace unsafe chars
            .replace(/_+/g, '_');                      // collapse multiple underscores
    }

    async getSignedUrl(bucket: SUPABASE_BUCKETS, path: string, expiresInSeconds: number = 60): Promise<string | null> {
        const { data, error } = await this.supabase.storage
            .from(bucket)
            .createSignedUrl(path, expiresInSeconds);

        if (error) {
            console.error('Signed URL error:', JSON.stringify(error));
            return null;
        }

        return data.signedUrl;
    }

    async getSignedUrls(
        bucket: SUPABASE_BUCKETS,
        entityId: string,
        fileNames: string[],
        expiresInSeconds: number = 3600
    ): Promise<Record<string, string>> {
        if (fileNames.length === 0) return {};

        const paths = fileNames.map(name => `${entityId}/${name}`);

        const { data, error } = await this.supabase.storage
            .from(bucket)
            .createSignedUrls(paths, expiresInSeconds);

        if (error) {
            console.error('getSignedUrls error:', error.message);
            return {};
        }

        const result: Record<string, string> = {};
        data.forEach((item, index) => {
            if (item.signedUrl) {
                result[fileNames[index]] = item.signedUrl;
            }
        });

        return result;
    }

    // Resolves a filename + folder into a full public URL
    // path should be in the format: '{customer_id}/{filename}'
    getPublicUrl(bucket: SUPABASE_BUCKETS, path: string): string {
        const { data } = this.supabase.storage
            .from(bucket)
            .getPublicUrl(path);

        return data.publicUrl;
    }

    /**
     * Uploads multiple files to entities-galleries/{entityId}/
     * Returns the list of stored file paths (relative to bucket root)
     */
    async uploadEntityGallery(
        entityId: string,
        files: File[],
        upsert: boolean = false  // ← false for inserts, true for updates
    ): Promise<string[]> {
        const uploadedPaths: string[] = [];

        for (const file of files) {
            const safeName = this.normalizeFileName(file.name);
            const path = `${entityId}/${safeName}`;

            const { error } = await this.supabase.storage
                .from(SUPABASE_BUCKETS.ENTITIES_GALLERIES)
                .upload(path, file, { upsert });

            if (error) {
                console.error(`Failed to upload ${file.name}:`, error.message);
                continue;
            }

            uploadedPaths.push(safeName);
        }

        return uploadedPaths;
    }
    async deleteEntityGalleryFiles(
        entityId: string,
        fileNames: string[]
    ): Promise<{ error: string | null }> {
        if (fileNames.length === 0) return { error: null };

        const paths = fileNames.map(name => `${entityId}/${name}`);

        const { error } = await this.supabase.storage
            .from(SUPABASE_BUCKETS.ENTITIES_GALLERIES)
            .remove(paths);

        if (error) {
            console.error('deleteEntityGalleryFiles error:', error.message);
            return { error: error.message };
        }

        return { error: null };
    }

    async upload(bucket: SUPABASE_BUCKETS, path: string, file: File) {
        const { data, error } = await this.supabase.storage
            .from(bucket)
            .upload(path, file);

        return { data, error };
    }

    async download(bucket: SUPABASE_BUCKETS, path: string) {
        const { data, error } = await this.supabase.storage
            .from(bucket)
            .download(path);

        return { data, error };
    }

    async createBucket() {
        const { data, error } = await this.supabase.storage.createBucket('photos');
        return { data, error };
    }

    async getBucket() {
        const { data, error } = await this.supabase.storage.getBucket('photos');
        return { data, error };
    }
}