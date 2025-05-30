import React, { useEffect, useRef } from "react";

export default function JitsiMeeting({ roomName, userName, userEmail }) {
  const jitsiContainerRef = useRef(null);
  const apiRef = useRef(null);

  useEffect(() => {
    if (!roomName) return;

    if (!window.JitsiMeetExternalAPI) {
      console.error("JitsiMeetExternalAPI not loaded");
      return;
    }

    if (apiRef.current) {
      apiRef.current.dispose();
    }

    const domain = "meet.jit.si";
    const options = {
      roomName: roomName.replace(/\s/g, ""),
      parentNode: jitsiContainerRef.current,
      width: "100%",
      height: "100%",
      userInfo: {
        displayName: userName || "Guest",
        email: userEmail || "",
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        DEFAULT_BACKGROUND: "#000000",
        LOBBY_ENABLED: false,  // try disabling lobby here
      },
      configOverwrite: {
        enableUserRolesBasedOnToken: false,
        enableLobby: false,  // try disabling lobby here too
        startWithAudioMuted: true,
        startWithVideoMuted: true,
      },
    };

    apiRef.current = new window.JitsiMeetExternalAPI(domain, options);

    return () => {
      if (apiRef.current) apiRef.current.dispose();
    };
  }, [roomName, userName, userEmail]);

  return (
    <div
      ref={jitsiContainerRef}
      style={{ height: "80vh", width: "100%", borderRadius: 8, overflow: "hidden", backgroundColor: "#000" }}
    />
  );
}
