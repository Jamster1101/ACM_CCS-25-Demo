import sys
import json
import struct
import re
import subprocess

def read_message():
    raw_len = sys.stdin.buffer.read(4)
    if not raw_len:
        sys.exit(0)
    msg_len = struct.unpack('@I', raw_len)[0]
    msg = sys.stdin.buffer.read(msg_len).decode('utf-8')
    return json.loads(msg)

def build_message(data):
    content = json.dumps(data, separators=(',', ':')).encode('utf-8')
    length = struct.pack('@I', len(content))
    return {'length': length, 'content': content}

def write_message(msg):
    sys.stdout.buffer.write(msg['length'])
    sys.stdout.buffer.write(msg['content'])
    sys.stdout.buffer.flush()

def find_default_gateway():
    try:
        result = subprocess.check_output("ipconfig", shell=True, text=True)
        match = re.search(r"Default Gateway[^\d]*(\d+\.\d+\.\d+\.\d+)", result)
        if match:
            return match.group(1)
    except subprocess.SubprocessError:
        pass
    return None

def find_mac_for_gateway(gateway):
    try:
        arp_output = subprocess.check_output("arp -a", shell=True, text=True)
        for line in arp_output.splitlines():
            if gateway in line:
                mac_match = re.search(r"([0-9a-fA-F]{2}([-:][0-9a-fA-F]{2}){5})", line)
                if mac_match:
                    return mac_match.group(1)
    except subprocess.SubprocessError:
        pass
    return None

def main():
    while True:
        message = read_message()
        if message == "ping":
            gateway = find_default_gateway()
            mac = find_mac_for_gateway(gateway)
            write_message(build_message(mac))

if __name__ == "__main__":
    main()
