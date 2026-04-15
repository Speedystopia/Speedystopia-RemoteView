import soundcard as sc
import sys

SAMPLERATE = 44100
CHANNELS = 2
BLOCKSIZE = 882  # 20ms chunks for low latency

# Get default speaker and open loopback recorder
speaker = sc.default_speaker()
print(f"[loopback] Capturing from: {speaker.name}", file=sys.stderr, flush=True)

mic = sc.get_microphone(speaker.id, include_loopback=True)

with mic.recorder(samplerate=SAMPLERATE, channels=CHANNELS, blocksize=BLOCKSIZE) as rec:
    while True:
        try:
            data = rec.record(numframes=BLOCKSIZE)
            # Convert float32 numpy array to raw bytes and write to stdout
            sys.stdout.buffer.write(data.astype('float32').tobytes())
            sys.stdout.buffer.flush()
        except BrokenPipeError:
            break
        except Exception as e:
            print(f"[loopback] Error: {e}", file=sys.stderr, flush=True)
            break
