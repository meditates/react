import { Check, ChevronsUpDown, X } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState } from "react";

type Option = {
  label: string;
  value: string;
};

interface MultiSelectProps {
  options: Option[];
  selected: Option[];
  onChange: (selected: Option[]) => void;
  placeholder?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select options...",
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);

  const toggleOption = (option: Option) => {
    if (selected.find((o) => o.value === option.value)) {
      onChange(selected.filter((o) => o.value !== option.value));
    } else {
      onChange([...selected, option]);
    }
  };

  const removeOption = (option: Option, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(selected.filter((o) => o.value !== option.value));
  };

  return (
    <div className="flex w-[300px] flex-col gap-2">
      {/* Dropdown */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-between min-h-[40px] h-auto py-2 border border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          >
            {selected.length > 0 ? (
              <div className="flex flex-wrap gap-1 max-w-[200px] items-start">
                {selected.map((option) => (
                  <Badge
                    key={option.value}
                    variant="outline"
                    className="flex items-center gap-1 text-xs border border-gray-300 bg-gray-50 hover:bg-gray-100"
                  >
                    {option.label}
                    <button
                      type="button"
                      className="h-3 w-3 cursor-pointer hover:text-red-500 transition-colors flex items-center justify-center"
                      onClick={(e) => removeOption(option, e)}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[300px] p-0 bg-white border border-gray-200 shadow-lg">
          <Command>
            <CommandInput placeholder="Search..." />
            <CommandEmpty>No option found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.find(
                  (o) => o.value === option.value
                );
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => toggleOption(option)}
                    className="cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
