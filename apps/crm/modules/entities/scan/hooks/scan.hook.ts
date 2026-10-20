"use client";

import { useMutation } from "@tanstack/react-query";

import { resolveScan } from "../api/scan.api";

export const useResolveScan = () => useMutation({ mutationFn: resolveScan });
