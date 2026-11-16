import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    TextField,
    DialogActions,
    Button,
    Autocomplete,
    Box,
    MenuItem,
} from '@mui/material';
import {
    codecName,
    getAvailableCodecs,
    loadSettings,
    presetName,
    Settings,
    VideoDisplayMode,
} from './settings';
import {NumberField} from './NumberField';

export interface SettingDialogProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    updateName: (s: string) => void;
    saveSettings: (s: Settings) => void;
}

const BrowserDefault = '';

const NativeCodecs = getAvailableCodecs();

export const SettingDialog = ({open, setOpen, updateName, saveSettings}: SettingDialogProps) => {
    const [settingsInput, setSettingsInput] = React.useState(loadSettings);

    const doSubmit = () => {
        saveSettings(settingsInput);
        updateName(settingsInput.name ?? '');
        setOpen(false);
    };

    const {name, preferCodec, displayMode, framerate, width, height, maxBitrate} = settingsInput;
    const selectedCodec = NativeCodecs.find((c) => c.mimeType === preferCodec?.mimeType);

    return (
        <Dialog open={open} onClose={() => setOpen(false)} maxWidth={'xs'} fullWidth>
            <DialogTitle>Settings</DialogTitle>
            <DialogContent>
                <form onSubmit={doSubmit}>
                    <Box sx={{paddingBottom: 1}}>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Username"
                            value={name}
                            onChange={(e) =>
                                setSettingsInput((c) => ({...c, name: e.target.value}))
                            }
                            fullWidth
                        />
                    </Box>
                    {NativeCodecs.length > 0 ? (
                        <Box sx={{paddingY: 1, display: 'flex', gap: 1}}>
                            <TextField
                                select
                                label="Codec"
                                value={selectedCodec?.mimeType ?? BrowserDefault}
                                onChange={(e) =>
                                    setSettingsInput((c) => ({
                                        ...c,
                                        preferCodec:
                                            e.target.value === BrowserDefault
                                                ? undefined
                                                : {mimeType: e.target.value},
                                    }))
                                }
                                fullWidth
                            >
                                <MenuItem value={BrowserDefault}>Browser Default</MenuItem>
                                {NativeCodecs.map(({mimeType}) => (
                                    <MenuItem key={mimeType} value={mimeType}>
                                        {codecName(mimeType)}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                select
                                label="Codec Preset"
                                value={
                                    selectedCodec?.presets.includes(preferCodec?.sdpFmtpLine ?? '')
                                        ? preferCodec?.sdpFmtpLine
                                        : BrowserDefault
                                }
                                disabled={!selectedCodec || selectedCodec.presets.length === 0}
                                onChange={(e) =>
                                    setSettingsInput((c) =>
                                        c.preferCodec
                                            ? {
                                                  ...c,
                                                  preferCodec: {
                                                      mimeType: c.preferCodec.mimeType,
                                                      sdpFmtpLine: e.target.value || undefined,
                                                  },
                                              }
                                            : c
                                    )
                                }
                                fullWidth
                            >
                                <MenuItem value={BrowserDefault}>Any</MenuItem>
                                {selectedCodec?.presets.map((preset) => (
                                    <MenuItem key={preset} value={preset}>
                                        {presetName(selectedCodec.mimeType, preset)}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Box>
                    ) : undefined}
                    <Box sx={{paddingTop: 1}}>
                        <Autocomplete<VideoDisplayMode>
                            options={Object.values(VideoDisplayMode)}
                            onChange={(_, value) =>
                                setSettingsInput((c) => ({
                                    ...c,
                                    displayMode: value ?? VideoDisplayMode.FitToWindow,
                                }))
                            }
                            value={displayMode}
                            fullWidth
                            renderInput={(params) => <TextField {...params} label="Display Mode" />}
                        />
                    </Box>
                    <Box sx={{paddingTop: 1}}>
                        <NumberField
                            label="FrameRate"
                            min={1}
                            onChange={(framerate) => setSettingsInput((c) => ({...c, framerate}))}
                            value={framerate}
                            fullWidth
                        />
                    </Box>
                    <Box sx={{paddingTop: 1}}>
                        <NumberField
                            label="Max Bandwidth (kbit/s)"
                            helperText="Per viewer. 0 = browser default (~2500 kbit/s at most)"
                            min={0}
                            onChange={(maxBitrate) => setSettingsInput((c) => ({...c, maxBitrate}))}
                            value={maxBitrate}
                            fullWidth
                        />
                    </Box>
                    <Box sx={{paddingTop: 1, display: 'flex', gap: 1}}>
                        <NumberField
                            label="Max Width (px)"
                            helperText="0 = unlimited"
                            min={0}
                            onChange={(width) => setSettingsInput((c) => ({...c, width}))}
                            value={width}
                            fullWidth
                        />
                        <NumberField
                            label="Max Height (px)"
                            helperText="0 = unlimited"
                            min={0}
                            onChange={(height) => setSettingsInput((c) => ({...c, height}))}
                            value={height}
                            fullWidth
                        />
                    </Box>
                </form>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setOpen(false)} color="primary">
                    Cancel
                </Button>
                <Button onClick={doSubmit} color="primary">
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
};
