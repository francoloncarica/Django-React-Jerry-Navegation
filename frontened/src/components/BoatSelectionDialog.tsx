
import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BoatSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (name: string, type: string) => void;
  defaultName?: string;
}

const BOAT_TYPES = [
  { value: "sailboat", label: "Sailboat" },
  { value: "motorboat", label: "Motorboat" },
  { value: "catamaran", label: "Catamaran" },
  { value: "yacht", label: "Yacht" },
  { value: "dinghy", label: "Dinghy" },
];

const BoatSelectionDialog: React.FC<BoatSelectionDialogProps> = ({ 
  open, 
  onOpenChange, 
  onConfirm, 
  defaultName = "My Boat" 
}) => {
  const [boatName, setBoatName] = React.useState(defaultName);
  const [boatType, setBoatType] = React.useState(BOAT_TYPES[0].value);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(boatName, boatType);
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Reset form when opening
      setBoatName(defaultName);
      setBoatType(BOAT_TYPES[0].value);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configure Boat</DialogTitle>
          <DialogDescription>
            Set a name and select a boat type for this track.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="boat-name">Boat Name</Label>
              <Input
                id="boat-name"
                value={boatName}
                onChange={(e) => setBoatName(e.target.value)}
                placeholder="Enter boat name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="boat-type">Boat Type</Label>
              <Select value={boatType} onValueChange={setBoatType}>
                <SelectTrigger id="boat-type" className="w-full">
                  <SelectValue placeholder="Select boat type" />
                </SelectTrigger>
                <SelectContent>
                  {BOAT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Confirm</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BoatSelectionDialog;
