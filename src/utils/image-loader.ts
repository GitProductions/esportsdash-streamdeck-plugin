import streamDeck from "@elgato/streamdeck";
import { promises as fs } from 'fs';
import path from 'path';
import fetch from 'node-fetch';
// Temporarily remove sharp import to test
// import sharp from 'sharp';

import { EventPayload, SelectTeamSettings } from '../types/types';

export class ImageLoader {
    static async processImage(url: string): Promise<string> {
        try {
            streamDeck.logger.info(`Loading image from URL: ${url}`);
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            return `data:image/png;base64,${Buffer.from(arrayBuffer).toString('base64')}`;
        } catch (error) {
            streamDeck.logger.error('Error processing image:', error);
            throw error;
        }
    }

    static async _fetchImageAsBase64ss(ev: EventPayload, url: string): Promise<string> {
        // Temporary placeholder to test without sharp
        return await ImageLoader.processImage(url);
    }
}