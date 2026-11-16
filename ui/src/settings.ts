import React from 'react';

// Legacy placeholder values from when codec + preset were a single setting.
const LegacyCodecBestQuality = 'BEST_QUALITY';
const LegacyCodecDefault = 'DEFAULT';

// Codecs that are not real video codecs and shouldn't be selectable.
const NonVideoCodecs = ['video/rtx', 'video/red', 'video/ulpfec', 'video/flexfec-03'];

export interface CodecOption {
    mimeType: string;
    presets: string[];
}

export const getAvailableCodecs = (): CodecOption[] => {
    if (!('getCapabilities' in RTCRtpSender)) {
        return [];
    }
    const result: CodecOption[] = [];
    (RTCRtpSender.getCapabilities('video')?.codecs ?? []).forEach(({mimeType, sdpFmtpLine}) => {
        if (NonVideoCodecs.includes(mimeType.toLowerCase())) {
            return;
        }
        let codec = result.find((c) => c.mimeType === mimeType);
        if (!codec) {
            codec = {mimeType, presets: []};
            result.push(codec);
        }
        if (sdpFmtpLine && !codec.presets.includes(sdpFmtpLine)) {
            codec.presets.push(sdpFmtpLine);
        }
    });
    return result;
};

export const codecName = (mimeType: string): string => {
    const name = mimeType.replace(/^video\//, '');
    return name.toLowerCase() === 'h265' ? `${name} (HEVC)` : name;
};

const fmtpParams = (sdpFmtpLine: string): Record<string, string> =>
    Object.fromEntries(
        sdpFmtpLine.split(';').map((part) => {
            const [key, value = ''] = part.trim().split('=');
            return [key, value];
        })
    );

const H264Profiles: Record<string, string> = {
    '42e0': 'Constrained Baseline',
    '4200': 'Baseline',
    '4d00': 'Main',
    '6400': 'High',
    f400: 'High 4:4:4',
};

export const presetName = (mimeType: string, sdpFmtpLine: string): string => {
    const params = fmtpParams(sdpFmtpLine);
    let name: string | undefined;
    switch (mimeType.toLowerCase()) {
        case 'video/vp9':
            name = {
                '0': 'Profile 0 (8-bit)',
                '1': 'Profile 1 (8-bit 4:4:4)',
                '2': 'Profile 2 (10-bit)',
                '3': 'Profile 3 (10-bit 4:4:4)',
            }[params['profile-id']];
            break;
        case 'video/av1':
            name = {'0': 'Main', '1': 'High', '2': 'Professional'}[params['profile']];
            break;
        case 'video/h265':
            name = {'1': 'Main', '2': 'Main 10'}[params['profile-id'] ?? '1'];
            if (name && params['tier-flag'] === '1') {
                name += ' High Tier';
            }
            if (name && params['level-id']) {
                // level-id is 30 * level, e.g. 93 = Level 3.1
                name += `, Level ${parseInt(params['level-id'], 10) / 30}`;
            }
            break;
        case 'video/h264':
            name = H264Profiles[params['profile-level-id']?.slice(0, 4).toLowerCase()];
            if (name && params['packetization-mode']) {
                name += ` (packetization ${params['packetization-mode']})`;
            }
            break;
    }
    return name ? `${name} – ${sdpFmtpLine}` : sdpFmtpLine;
};

export interface Settings {
    name?: string;
    displayMode: VideoDisplayMode;
    // undefined = browser default
    preferCodec?: PreferredCodec;
    framerate: number;
    width: number;
    height: number;
    // kbit/s, 0 = browser default
    maxBitrate: number;
}
export interface PreferredCodec {
    mimeType: string;
    // undefined = any preset of the codec
    sdpFmtpLine?: string;
}

export enum VideoDisplayMode {
    FitToWindow = 'FitToWindow',
    FitWidth = 'FitWidth',
    FitHeight = 'FitHeight',
    OriginalSize = 'OriginalSize',
}

const SettingsKey = 'screegoSettings';

const migrateCodec = (codec: PreferredCodec | undefined): PreferredCodec | undefined => {
    switch (codec?.mimeType) {
        case LegacyCodecBestQuality:
            return {mimeType: 'video/VP9', sdpFmtpLine: 'profile-id=2'};
        case LegacyCodecDefault:
            return undefined;
        default:
            return codec;
    }
};

export const loadSettings = (): Settings => {
    const settings: Partial<Settings> = JSON.parse(localStorage.getItem(SettingsKey) ?? '{}') ?? {};

    const defaults: Settings = {
        displayMode: VideoDisplayMode.FitToWindow,
        framerate: 30,
        width: 0,
        height: 0,
        maxBitrate: 0,
    };

    if (settings && typeof settings === 'object') {
        return {
            name: settings.name?.toString(),
            framerate: settings.framerate ?? defaults.framerate,
            displayMode:
                Object.values(VideoDisplayMode).find((mode) => mode === settings.displayMode) ??
                defaults.displayMode,
            preferCodec: migrateCodec(settings.preferCodec),
            width: settings.width ?? defaults.width,
            height: settings.height ?? defaults.height,
            maxBitrate: settings.maxBitrate ?? defaults.maxBitrate,
        };
    }
    return defaults;
};

export const saveSettings = (settings: Settings): void => {
    localStorage.setItem(SettingsKey, JSON.stringify(settings));
};

export const useSettings = (): [Settings, (s: Settings) => void] => {
    const [settings, setSettings] = React.useState(loadSettings);

    return [
        settings,
        (newSettings) => {
            setSettings(newSettings);
            saveSettings(newSettings);
        },
    ];
};
