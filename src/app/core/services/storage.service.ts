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

    // Resolves a filename + folder into a full public URL
    // path should be in the format: '{customer_id}/{filename}'
    getPublicUrl(bucket: SUPABASE_BUCKETS, path: string): string {
        const { data } = this.supabase.storage
            .from(bucket)
            .getPublicUrl(path);

        return data.publicUrl;
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