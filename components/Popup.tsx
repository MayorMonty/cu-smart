import { motion } from "framer-motion";
import { popIn } from "../animations";

export type Props = {
  children: React.ReactNode;
  show: boolean;
};

export default function Popup({ children, show }: Props) {
  if (!show) {
    return <></>;
  }

  return (
    <div className="w-screen h-screen fixed top-0 left-0 bg-orange bg-opacity-75 flex justify-center items-center">
      <motion.div {...popIn} className="w-96 bg-white p-6 rounded-2xl">
        {children}
      </motion.div>
    </div>
  );
}