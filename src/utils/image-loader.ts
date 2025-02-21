import streamDeck from "@elgato/streamdeck";
import { createCanvas, loadImage } from 'canvas';
import { promises as fs } from 'fs';
import path from 'path';
import fetch from 'node-fetch';

import { EventPayload, SelectTeamSettings } from '../types/types';

export class ImageLoader {
    static async processImage(url: string): Promise<string> {
        try {
            streamDeck.logger.info(`Loading image from URL: ${url}`);
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            return `data:image/png;base64,${Buffer.from(arrayBuffer).toString('base64')}`;
            // await this._fetchImageAsBase64ss(ev, url);
        } catch (error) {
            streamDeck.logger.error('Error processing image:', error);
            throw error;
        }
    }


       // layering the team logo on top of a base image
    static async _fetchImageAsBase64ss(ev:EventPayload, url: string): Promise<string> {
        const test12 = "hmm"
        const MAX_SIZE = 72;
    
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
    
    // PROBLEM IS LOAD IMAGE

        // // Load remote and local images
        const img = await loadImage(buffer);
        // const localImagePath = path.resolve('imgs/actions/selectteam/teamSelect-t1.png');
        const localImagePath = path.resolve(`imgs/actions/selectteam/teamSelect-t${ev.payload.settings.teamSide}.png`);
        const localImageBuffer = await fs.readFile(localImagePath);
        const localImg = await loadImage(localImageBuffer);
    
        // Function to resize an image while maintaining aspect ratio
        const resizeImage = (image: any) => {
            const scale = Math.min(MAX_SIZE / image.width, MAX_SIZE / image.height);
            return {
                width: Math.round(image.width * scale),
                height: Math.round(image.height * scale),
            };
        };
    
        const imgSize = resizeImage(img);
        const localImgSize = resizeImage(localImg);
    
        // Create a fixed 128x128 canvas
        const canvas = createCanvas(MAX_SIZE, MAX_SIZE);
        const ctx = canvas.getContext('2d');
    
        // Calculate positions to center images
        const imgX = (MAX_SIZE - imgSize.width) / 2;
        const imgY = (MAX_SIZE - imgSize.height) / 2;
        const localImgX = (MAX_SIZE - localImgSize.width) / 2;
        const localImgY = (MAX_SIZE - localImgSize.height) / 2;
    
        // Draw images centered on the canvas
        ctx.drawImage(img, imgX, imgY, imgSize.width, imgSize.height);
        ctx.drawImage(localImg, localImgX, localImgY, localImgSize.width, localImgSize.height);
    
        return canvas.toDataURL('image/png');
        // return test12;
}}






 // Keep all the commented out image processing code here
    // private async loadImageFromBuffer(buffer: Buffer): Promise<Image> {
    //     if (typeof globalThis.process !== 'undefined' && globalThis.process.versions != null && globalThis.process.versions.node != null) {
    //         // Node.js environment
    //         return loadImage(buffer);
    //     } else {
    //         // Browser environment
    //         return new Promise((resolve, reject) => {
    //             const blob = new Blob([buffer]);
    //             const url = URL.createObjectURL(blob);
    //             const img = new Image();
    //             img.onload = () => {
    //                 URL.revokeObjectURL(url);
    //                 resolve(img);
    //             };
    //             img.onerror = (error) => {
    //                 URL.revokeObjectURL(url);
    //                 reject(error);
    //             };
    //             img.src = url;
    //         });
    //     }
    // }



// import { createCanvas,
//      loadImage,
//      Image 
//     } from 'canvas';
// import { promises as fs } from 'fs';
// import path from 'path';


    // Keep all the commented out image processing code here
    // private async loadImageFromBuffer(buffer: Buffer): Promise<Image> {
    //     if (typeof globalThis.process !== 'undefined' && globalThis.process.versions != null && globalThis.process.versions.node != null) {
    //         // Node.js environment
    //         return loadImage(buffer);
    //     } else {
    //         // Browser environment
    //         return new Promise((resolve, reject) => {
    //             const blob = new Blob([buffer]);
    //             const url = URL.createObjectURL(blob);
    //             const img = new Image();
    //             img.onload = () => {
    //                 URL.revokeObjectURL(url);
    //                 resolve(img);
    //             };
    //             img.onerror = (error) => {
    //                 URL.revokeObjectURL(url);
    //                 reject(error);
    //             };
    //             img.src = url;
    //         });
    //     }
    // }
    
    // private async _fetchImageAsBase64(ev: EventPayload, url: string): Promise<string> {
    //     try {
    //         const MAX_SIZE = 72;
    
    //         const response = await fetch(url);
    //         const arrayBuffer = await response.arrayBuffer();
    //         const buffer = Buffer.from(arrayBuffer);
    
    //         // Load remote image
    //         let img;
    //         try {
    //             img = await this.loadImageFromBuffer(buffer);
    //         } catch (error) {
    //             console.error('Error loading remote image:', error);
    //             throw error;
    //         }
    
    //         // Load local image
    //         const localImagePath = `imgs/actions/selectteam/teamSelect-t${ev.payload.settings.teamSide}.png`;
    //         let localImg;
    //         try {
    //             const localImageBuffer = await fs.readFile(localImagePath);
    //             localImg = await this.loadImageFromBuffer(localImageBuffer);
    //         } catch (error) {
    //             console.error('Error loading local image:', error);
    //             throw error;
    //         }
    
    //         // Function to resize an image while maintaining aspect ratio
    //         const resizeImage = (image: Image) => {
    //             const scale = Math.min(MAX_SIZE / image.width, MAX_SIZE / image.height);
    //             return {
    //                 width: Math.round(image.width * scale),
    //                 height: Math.round(image.height * scale),
    //             };
    //         };
    
    //         const imgSize = resizeImage(img);
    //         const localImgSize = resizeImage(localImg);
    
    //         // Create a fixed 128x128 canvas
    //         const canvas = createCanvas(MAX_SIZE, MAX_SIZE);
    //         const ctx = canvas.getContext('2d');
    
    //         // Calculate positions to center images
    //         const imgX = (MAX_SIZE - imgSize.width) / 2;
    //         const imgY = (MAX_SIZE - imgSize.height) / 2;
    //         const localImgX = (MAX_SIZE - localImgSize.width) / 2;
    //         const localImgY = (MAX_SIZE - localImgSize.height) / 2;
    
    //         // Draw images centered on the canvas
    //         ctx.drawImage(img, imgX, imgY, imgSize.width, imgSize.height);
    //         ctx.drawImage(localImg, localImgX, localImgY, localImgSize.width, localImgSize.height);
    
    //         return canvas.toDataURL('image/png');
    //     } catch (error) {
    //         console.error('Error in _fetchImageAsBase64:', error);
    //         throw error;
    //     }
    // }

    // using just the basic image
    // private async _fetchImageAsBase64(url: string): Promise<string> {
    //     const response = await fetch(url);
    //     const arrayBuffer = await response.arrayBuffer();
    //     return `data:image/png;base64,${Buffer.from(arrayBuffer).toString('base64')}`;
    // }

    // layering the team logo on top of a base image
    // private async _fetchImageAsBase64ss(ev:EventPayload, url: string): Promise<string> {
    //     const test12 = "hmm"
    //     const MAX_SIZE = 72;
    
    //     const response = await fetch(url);
    //     const arrayBuffer = await response.arrayBuffer();
    //     const buffer = Buffer.from(arrayBuffer);
    
    // // PROBLEM IS LOAD IMAGE

    //     // // Load remote and local images
    //     const img = await loadImage(buffer);
    //     // const localImagePath = path.resolve('imgs/actions/selectteam/teamSelect-t1.png');
    //     // const localImagePath = path.resolve(`imgs/actions/selectteam/teamSelect-t${ev.payload.settings.teamSide}.png`);
    //     // const localImageBuffer = await fs.readFile(localImagePath);
    //     // const localImg = await loadImage(localImageBuffer);
    
    //     // // Function to resize an image while maintaining aspect ratio
    //     // const resizeImage = (image: any) => {
    //     //     const scale = Math.min(MAX_SIZE / image.width, MAX_SIZE / image.height);
    //     //     return {
    //     //         width: Math.round(image.width * scale),
    //     //         height: Math.round(image.height * scale),
    //     //     };
    //     // };
    
    //     // const imgSize = resizeImage(img);
    //     // const localImgSize = resizeImage(localImg);
    
    //     // // Create a fixed 128x128 canvas
    //     // const canvas = createCanvas(MAX_SIZE, MAX_SIZE);
    //     // const ctx = canvas.getContext('2d');
    
    //     // // Calculate positions to center images
    //     // const imgX = (MAX_SIZE - imgSize.width) / 2;
    //     // const imgY = (MAX_SIZE - imgSize.height) / 2;
    //     // const localImgX = (MAX_SIZE - localImgSize.width) / 2;
    //     // const localImgY = (MAX_SIZE - localImgSize.height) / 2;
    
    //     // // Draw images centered on the canvas
    //     // ctx.drawImage(img, imgX, imgY, imgSize.width, imgSize.height);
    //     // ctx.drawImage(localImg, localImgX, localImgY, localImgSize.width, localImgSize.height);
    
    //     // return canvas.toDataURL('image/png');
    //     return test12;

    
