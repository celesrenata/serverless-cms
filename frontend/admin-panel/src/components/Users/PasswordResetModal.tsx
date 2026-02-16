import { X } from 'lucide-react';
import { User } from '../../types';

interface PasswordResetModalProps {
  user: User;
  onClose: () => void;
  onReset: () => Promise<void>;
}

export default function PasswordResetModal({ user, onClose, onReset }: PasswordResetModalProps) {
  const handleReset = async () => {
    await onReset();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold">Reset Password</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-700 mb-4">
            Are you sure you want to reset the password for <strong>{user.name || user.display_name || 'this user'}</strong> ({user.email})?
          </p>
          <p className="text-gray-600 text-sm mb-6">
            A password reset email will be sent to the user's email address with instructions to create a new password.
          </p>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              Send Reset Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
