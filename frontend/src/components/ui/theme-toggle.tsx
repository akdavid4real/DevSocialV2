"use client"

import * as React from "react"
import { Moon, Sun, Palette } from "lucide-react"
import { useTheme } from "@/providers/theme-provider"
import { useAppearance } from "@/contexts/appearance-context"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
    const { setTheme, theme } = useTheme()
    const { colorTheme, setColorTheme } = useAppearance()

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full shadow-sm">
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 sm:w-72 p-2">
                <DropdownMenuLabel className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest">
                    <Sun className="h-4 w-4" /> Mode
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setTheme("light")} className="flex justify-between items-center cursor-pointer rounded-xl transition-colors">
                    <span className="font-medium">Light</span>
                    {theme === "light" && <span className="text-primary">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")} className="flex justify-between items-center cursor-pointer rounded-xl transition-colors">
                    <span className="font-medium">Dark</span>
                    {theme === "dark" && <span className="text-primary">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")} className="flex justify-between items-center cursor-pointer rounded-xl transition-colors">
                    <span className="font-medium">System</span>
                    {theme === "system" && <span className="text-primary">✓</span>}
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-2" />

                <DropdownMenuLabel className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest">
                    <Palette className="h-4 w-4" /> Color Palette
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setColorTheme("vibrant")} className="flex justify-between items-center cursor-pointer rounded-xl transition-colors p-3">
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-[#7c3aed] ring-2 ring-[#7c3aed]/20" />
                        <div>
                            <div className="font-semibold">Vibrant</div>
                            <div className="text-xs text-muted-foreground/60">Purple & Cyan</div>
                        </div>
                    </div>
                    {colorTheme === "vibrant" && <span className="text-primary text-lg">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setColorTheme("classic")} className="flex justify-between items-center cursor-pointer rounded-xl transition-colors p-3">
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-[#059669] ring-2 ring-[#059669]/20" />
                        <div>
                            <div className="font-semibold">Classic</div>
                            <div className="text-xs text-muted-foreground/60">Emerald & Gray</div>
                        </div>
                    </div>
                    {colorTheme === "classic" && <span className="text-primary text-lg">✓</span>}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
