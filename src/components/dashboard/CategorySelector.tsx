import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/data/categories";
import { Check } from "lucide-react";

interface CategorySelectorProps {
  selectedCategories: string[];
  onSelectionChange: (categories: string[]) => void;
}

export function CategorySelector({
  selectedCategories,
  onSelectionChange,
}: CategorySelectorProps) {
  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      onSelectionChange(selectedCategories.filter((id) => id !== categoryId));
    } else {
      onSelectionChange([...selectedCategories, categoryId]);
    }
  };

  const selectAll = () => {
    onSelectionChange(CATEGORIES.map((c) => c.id));
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  return (
    <Card variant="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">카테고리 선택</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={selectAll}
            >
              전체선택
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={clearAll}
            >
              초기화
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CATEGORIES.map((category) => {
            const isSelected = selectedCategories.includes(category.id);
            return (
              <button
                key={category.id}
                onClick={() => toggleCategory(category.id)}
                className={cn(
                  "relative flex items-center gap-2 p-3 rounded-lg border transition-all duration-200",
                  "hover:scale-[1.02]",
                  isSelected
                    ? "bg-primary/10 border-primary/50 text-foreground"
                    : "bg-secondary/30 border-border/50 text-muted-foreground hover:border-border"
                )}
              >
                <span className="text-xl">{category.icon}</span>
                <span className="text-sm font-medium">{category.name}</span>
                {isSelected && (
                  <Check className="absolute top-2 right-2 w-4 h-4 text-primary" />
                )}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          * 의류 카테고리는 소싱 분석에서 제외됩니다
        </p>
      </CardContent>
    </Card>
  );
}
