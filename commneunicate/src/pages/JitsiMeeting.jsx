import React, { useEffect, useRef } from "react";

export default function JitsiMeeting({ roomName }) {
  const jitsiContainerRef = useRef(null);

  useEffect(() => {
    if (!roomName) return;

    const domain = "meet.jit.si";
    const options = {
      roomName: roomName,
      parentNode: jitsiContainerRef.current,
      width: "100%",
      height: "100%",
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        DEFAULT_BACKGROUND: "#000000",
      },
    };

    const api = new window.JitsiMeetExternalAPI(domain, options);

    return () => api.dispose();
  }, [roomName]);

  return (
    <div
      ref={jitsiContainerRef}
      style={{ height: "80vh", width: "100%", borderRadius: 8, overflow: "hidden" }}
    />
  );
}
