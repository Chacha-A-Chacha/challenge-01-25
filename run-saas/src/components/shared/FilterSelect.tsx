"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface FilterOption {
  label: string
  value: string
}

interface FilterSelectProps {
  label?: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function FilterSelect({
  label,
  value,
  options,
  onChange,
  placeholder = "Select...",
  className
}: FilterSelectProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <Label className="text-sm font-medium">{label}</Label>
      )}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
