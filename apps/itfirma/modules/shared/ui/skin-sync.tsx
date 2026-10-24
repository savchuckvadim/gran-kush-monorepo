"use client";

import { useEffect } from "react";

import { restoreSkin } from "./use-skin";

/** Puts the saved look back once the page has mounted; renders nothing. */
export const SkinSync = () => {
    useEffect(() => {
        restoreSkin();
    }, []);

    return null;
};
