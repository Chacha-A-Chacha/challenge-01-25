"use client";

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onDateRangeChange: (startDate: string, endDate: string) => void;
  className?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onDateRangeChange,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(
    new Date(startDate),
  );
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(
    new Date(endDate),
  );

  const handleApply = () => {
    if (tempStartDate && tempEndDate) {
      onDateRangeChange(
        tempStartDate.toISOString().split("T")[0],
        tempEndDate.toISOString().split("T")[0],
      );
      setIsOpen(false);
    }
  };

  const handleQuickSelect = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    setTempStartDate(start);
    setTempEndDate(end);
    onDateRangeChange(
      start.toISOString().split("T")[0],
      end.toISOString().split("T")[0],
    );
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !startDate && !endDate && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {startDate && endDate ? (
            <>
              {format(new Date(startDate), "MMM dd, yyyy")} -{" "}
              {format(new Date(endDate), "MMM dd, yyyy")}
            </>
          ) : (
            <span>Pick a date range</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-4">
          {/* Quick select buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSelect(7)}
            >
              Last 7 days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSelect(30)}
            >
              Last 30 days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSelect(90)}
            >
              Last 3 months
            </Button>
          </div>

          <div className="border-t pt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium mb-2">Start Date</p>
              <Calendar
                mode="single"
                selected={tempStartDate}
                onSelect={setTempStartDate}
                disabled={(date) => (tempEndDate ? date > tempEndDate : false)}
                initialFocus
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-2">End Date</p>
              <Calendar
                mode="single"
                selected={tempEndDate}
                onSelect={setTempEndDate}
                disabled={(date) =>
                  tempStartDate
                    ? date < tempStartDate || date > new Date()
                    : date > new Date()
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTempStartDate(new Date(startDate));
                setTempEndDate(new Date(endDate));
                setIsOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              disabled={!tempStartDate || !tempEndDate}
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
