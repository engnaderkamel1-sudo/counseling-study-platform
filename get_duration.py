import struct

def get_mp3_duration(path):
    with open(path, 'rb') as f:
        data = f.read()

    idx = 0
    total_frames = 0
    sample_rate = 0
    duration = 0.0

    # Bitrate lookup for MPEG-2 / MPEG-2.5 Layer III (Edge TTS usually outputs 24kHz / 48kbps or similar)
    # Let's inspect frame by frame
    pos = 0
    l = len(data)
    bitrates_v2_l3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]
    bitrates_v1_l3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
    sample_rates_v1 = [44100, 48000, 32000, 0]
    sample_rates_v2 = [22050, 24000, 16000, 0]

    while pos < l - 4:
        if data[pos] == 0xFF and (data[pos+1] & 0xE0) == 0xE0:
            version = (data[pos+1] >> 3) & 0x03
            layer = (data[pos+1] >> 1) & 0x03
            bitrate_idx = (data[pos+2] >> 4) & 0x0F
            sr_idx = (data[pos+2] >> 2) & 0x03
            padding = (data[pos+2] >> 1) & 0x01

            if version == 3 and layer == 1: # MPEG 1 Layer 3
                br = bitrates_v1_l3[bitrate_idx] * 1000
                sr = sample_rates_v1[sr_idx]
                frame_len = (144 * br // sr) + padding
                samples_per_frame = 1152
            elif version == 2 and layer == 1: # MPEG 2 Layer 3
                br = bitrates_v2_l3[bitrate_idx] * 1000
                sr = sample_rates_v2[sr_idx]
                frame_len = (72 * br // sr) + padding
                samples_per_frame = 576
            else:
                pos += 1
                continue

            if frame_len <= 0 or pos + frame_len > l:
                pos += 1
                continue

            total_frames += 1
            duration += samples_per_frame / sr
            pos += frame_len
        else:
            pos += 1

    return duration

dur = get_mp3_duration('chap4_drive.mp3')
mins = dur / 60
print(f'MP3 Duration: {dur:.2f} seconds ({mins:.2f} minutes)')
