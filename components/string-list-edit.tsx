import { useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Plus, Trash } from 'lucide-react';

interface EditStringArrayProps {
  initialStrings?: string[];
  onChange?: (updatedStrings: string[]) => void; // Callback for when the strings array changes
}

const EditStringArray: React.FC<EditStringArrayProps> = ({ initialStrings = [], onChange }) => {
  const [strings, setStrings] = useState<string[]>(initialStrings);

  // Handle adding a new string
  const handleAddString = () => {
    const updatedStrings = [...strings, ''];
    setStrings(updatedStrings);
    onChange?.(updatedStrings); // Call the onChange prop if provided
  };

  // Handle editing an existing string
  const handleEditString = (index: number, updatedString: string) => {
    const updatedStrings = [...strings];
    updatedStrings[index] = updatedString;
    setStrings(updatedStrings);
    onChange?.(updatedStrings); // Call the onChange prop if provided
  };

  // Handle deleting a string
  const handleDeleteString = (index: number) => {
    const updatedStrings = strings.filter((_, i) => i !== index);
    setStrings(updatedStrings);
    onChange?.(updatedStrings); // Call the onChange prop if provided
  };

  return (
    <ul className='space-y-2'>
      {strings.map((str, index) => (
        <li key={index} className='flex gap-2'>
          <Input
            type="text"
            value={str}
            onChange={(e) => handleEditString(index, e.target.value)}
          />
          <Button onClick={() => handleDeleteString(index)} disabled={strings.length <= 1}><Trash /></Button>
        </li>
      ))}
      <Button onClick={handleAddString}><Plus /></Button>
    </ul>
  );
}

export default EditStringArray;
