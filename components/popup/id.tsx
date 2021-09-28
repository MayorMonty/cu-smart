import Popup from "../Popup";
import { Input, Button } from "../Input";

import { useEffect, useState } from "react";

export const getID = () => {
  if (typeof window !== "undefined") {
    const id = localStorage.getItem("id");
    if (id) return id;
    else return "";
  } else {
    return "";
  }
};

export default function PopupID() {
  const [popup, setPopup] = useState(false);
  useEffect(() => {
    if (getID() === "") {
      setPopup(true);
    }
  }, []);

  const id = getID();

  if (popup) {
    return (
      <Popup show={id == ""}>
        <h1 className="text-xl">Enter Your Participant ID to Continue</h1>
        <p className="text-base my-4 text-gray-500">
          You should be able to get this number from the experiment supervisor.
          This number uniquely and anonymously identifies you, and is used to
          build your personalized recommendations.
        </p>

        <p className="text-base text-gray-500 my-4">
          This number is stored locally on your device, and submitted when you
          submit feedback.{" "}
        </p>
        <Input
          placeholder="Your Participant ID"
          type="number"
          onChange={(event) => localStorage.setItem("id", event.target.value)}
        />
        <Button text="Submit" onClick={() => (id ? setPopup(false) : null)} />
      </Popup>
    );
  };

  return <></>;
}
