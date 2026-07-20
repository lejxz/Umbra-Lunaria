"use client";
import { useEffect, useState } from "react";
export function TimeAgo({ date }: { date: Date | string }) { const [text, setText] = useState("recently"); useEffect(() => { const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000)); setText(seconds < 60 ? "just now" : seconds < 3600 ? `${Math.floor(seconds / 60)}m ago` : `${Math.floor(seconds / 3600)}h ago`); }, [date]); return <time dateTime={new Date(date).toISOString()}>{text}</time>; }
